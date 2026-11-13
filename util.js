/**
 * util.js — 自习模拟器公共工具层 (v1.3)
 *
 * 职责：
 *   1. 统一「本地时区日期」口径，杜绝 toISOString() 在 UTC+8 凌晨的跨日错误
 *   2. 计时状态机的纯函数（可脱离 DOM 单测）
 *   3. 全局共享唯一 AudioContext（sound.js 与 ambient.js 复用）
 *
 * 以普通脚本加载（保持 file:// 双击可用），同时兼容 Node require 以便自测。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StudyUtil = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var VERSION = '1.6.0';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** 本地时区 YYYY-MM-DD；绝不使用 UTC 的 toISOString().slice(0,10) */
  function localDateKey(date) {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** 'YYYY-MM-DD' -> 本地零点 Date；非法日期（如 2 月 30 日）返回 null */
  function parseLocalDate(str) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str || '')) return null;
    var parts = str.split('-').map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    if (dt.getFullYear() !== parts[0] || dt.getMonth() !== parts[1] - 1 || dt.getDate() !== parts[2]) return null;
    return dt;
  }

  function addDays(date, n) {
    var d = new Date(date instanceof Date ? date.getTime() : date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function clamp(n, min, max, fallback) {
    var v = Number(n);
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  }

  /* ===== 计时状态机（纯函数） =====
   * 番茄钟：运行时用 endAt 绝对时间戳推导剩余秒；暂停时用冻结的 remaining。
   * 正计时：baseElapsed + 本次运行的墙钟差，不用 setInterval 逐秒累加，后台节流不漂移。
   */
  function pomodoroRemaining(p, now) {
    if (!p) return 0;
    if (p.isRunning) {
      return Math.max(0, Math.ceil((p.endAt - now) / 1000));
    }
    return Math.max(0, Math.floor(p.remaining || 0));
  }

  function stopwatchElapsed(s, now) {
    if (!s) return 0;
    var base = Math.max(0, Math.floor(s.baseElapsed || 0));
    if (s.isRunning) {
      return Math.max(0, base + Math.floor((now - s.startedAt) / 1000));
    }
    return base;
  }

  function splitHMS(totalSec) {
    var t = Math.max(0, Math.floor(totalSec || 0));
    return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
  }

  /** 距目标日期的自然日天数：本地零点对齐，只按天计，过期按 0 处理 */
  function daysUntil(dateStr) {
    var target = parseLocalDate(dateStr);
    if (!target) return 0;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
  }

  /** 秒 -> 中文展示文本 */
  function formatDuration(seconds) {
    var mins = Math.round((seconds || 0) / 60);
    if (mins < 60) return mins + ' 分钟';
    var h = Math.floor(mins / 60), m = mins % 60;
    return m ? h + ' 小时 ' + m + ' 分' : h + ' 小时';
  }

  /** 兼容 1.2 记录的 durationMinutes 与 1.3 的 durationSeconds */
  function recordSeconds(r) {
    if (!r) return 0;
    if (typeof r.durationSeconds === 'number') return r.durationSeconds;
    return Math.round((r.durationMinutes || 0) * 60);
  }

  /* ===== 全局唯一 AudioContext ===== */
  /* ===== 拼音索引（离线字符表，供设置搜索做全拼 / 首字母 / 模糊匹配） =====
   * 只收录设置界面出现过的汉字，表体约 2.5 KB，随脚本离线加载，零网络依赖。
   * 格式 "音节:汉字串" 以 ; 分隔，按音节归并比逐字列出更省体积。
   */
  var PY_TABLE = 'ai:爱;an:暗按案安;ao:熬;ba:把吧;bai:白百败;ban:办板半版;bang:绑;bao:保薄宝抱;bei:背备悲北被;ben:本奔;bi:闭壁避碧必毕比;bian:边变遍便扁;biao:标;bie:别;bing:并病;bo:播钵泊博;bu:部不步布补;cai:采材才;can:参残;cang:藏沧;cao:操;ce:侧测;ceng:曾层;cha:差查;chan:禅;chang:长常;chao:潮;che:车撤;chen:衬尘沉晨;cheng:程成称城诚呈;chi:持迟;chu:除出触初处;chuan:船传;chuang:窗;chun:纯春;chuo:戳;ci:词此次;cong:从;cou:凑;cun:存寸村;cuo:错蹉;da:大打答达;dai:待代带怠;dan:单淡但;dang:当档;dao:导倒到道;de:的德得;deng:等灯;di:滴低地底笛迪抵第;dian:点;diao:掉;die:叠;ding:顶定;diu:丢;dong:动东冬;dou:都斗;du:独度笃读渡;duan:段;dui:对队;duo:多朵;er:二迩而儿尔;fa:发法;fan:翻番返帆凡繁;fang:仿方放访妨;fei:废;fen:分份氛奋;feng:锋风;fou:否;fu:浮复俯负腹赴赋服辅;gai:盖改;gan:干感赶敢;gao:高;ge:个格各;gei:给;gen:根;geng:更;gong:功工躬弓拱;gou:苟构沟;gu:古顾辜故;gua:挂;guan:关观管;guang:光;gui:归贵;guo:果过;hai:还海;han:寒憾汗含;hao:号皓好;he:和核何;hei:黑;hen:很;heng:衡;hong:鸿弘;hou:后厚;hu:呼互忽户;hua:滑化花华话;huan:换环缓欢;huang:晃黄荒;hui:会回恢悔;hun:混昏;huo:火或活霍;ji:计极集即寄击记辑几积及鸡济既寂己饥际继级急;jia:加;jian:间减荐简键兼见健谏剑坚件建监;jiang:降将;jiao:角交脚较;jie:结节界接捷皆洁解阶;jin:紧今近浸金进劲尽津仅;jing:景境静竞经精径;jiu:久九就旧;ju:距句局具据惧聚;juan:捐;jue:觉绝决;jun:君;ka:卡;kai:开;kan:看瞰槛;kao:靠考;ke:可棵客刻;kong:空控;kou:口;ku:库苦;kua:跨;kuai:快块;kuan:宽;kuang:框况;kui:跬;kun:坤;l:率绿履律;la:蜡;lai:来莱;lan:栏览兰;lang:朗浪;lao:老;le:乐略;lei:类累;li:立粒里例离历力理励利砺礼;lian:联;liang:量亮;liao:了;lie:列;lin:临;ling:零灵凌岭铃;liu:六柳留流;lou:楼镂;lu:录炉路芦;lun:轮;luo:逻罗落;ma:码马吗;man:慢漫满曼;mang:芒;me:么;mei:每梅没美;men:们门;meng:蒙梦;mi:谧密;mian:面免勉;miao:秒;ming:明名命;mo:模默摸莫磨寞;mu:目幕木姆;na:那;nai:耐;nan:难男南;ne:呢;nei:内;neng:能;ni:拟逆你尼;nian:年念;ning:宁;niu:钮;nu:努;pa:怕帕;pan:畔;pei:配培;pen:盆;pian:片;piao:飘漂;ping:屏平;po:破;pu:铺普;qi:器期启憩其气弃起齐;qian:前千浅乾迁;qiang:强;qiao:乔;qie:切茄锲且;qin:勤;qing:清晴轻情请倾;qiong:穷;qiu:求裘;qu:区取渠去;quan:全;que:确;ran:染然;rang:让;rao:扰;re:热;ren:认人任忍;reng:仍;ri:日;rong:容;rou:柔;ru:如入;run:润;ruo:若;sai:塞;san:三;sang:桑;se:色;sha:杀沙;shan:删善山闪;shang:上尚伤;shao:少韶;she:设舍射;shen:身什深;sheng:声盛生剩;shi:时实视式始示试是事使市失十石势士诗识世史适;shou:手首守受收;shu:数书舒疏输鼠树束;shua:刷;shuang:双;shui:水谁;shuo:烁;si:丝四思斯死;song:颂送;sou:搜;su:速素;suan:算;sui:岁;suo:索缩所;ta:它塔;tai:态台太;tan:弹;tang:唐;te:特;teng:腾;ti:体提题替;tian:天添田;tiao:调跳;ting:听停;tong:统同通;tou:透头;tu:图徒途;tui:推退腿;tuo:拖跎;wai:外;wan:完万晚挽;wang:往忘网望王;wei:微围位为未唯伟苇;wen:文问;wo:我;wu:无五误物吾悟芜舞务;xi:习晰细吸系息汐嬉兮西喜希;xia:下霞;xian:现线弦显先闲羡限;xiang:项详香向响相想;xiao:小效消销校;xie:写懈;xin:心新信;xing:星行醒性幸;xiong:雄;xiu:休修;xu:许序虚须续;xuan:选渲悬;xue:雪学;xun:循;ya:压涯;yan:眼言验;yang:样仰;yao:要;ye:页野夜业腋也;yi:已异一意移义以毅疑遗议;yin:引音隐阴;ying:萤应英影;yong:用勇永;you:有右由优又;yu:与雨预语于欲榆玉鱼愚余;yuan:缘圆远源愿渊怨元;yue:越月约;yun:云运;zai:再载在;zan:暂;zao:噪早造;ze:择则;zeng:增;zhai:摘;zhan:展占站;zhang:丈章张;zhao:照找;zhe:这者着折;zhen:帧真;zheng:正争证整;zhi:置纸值制直指支志至之致知止只;zhong:钟终种中重众;zhou:舟周;zhu:注住主筑烛助驻逐;zhuan:专;zhuang:状壮;zhui:追;zhun:准;zhuo:桌;zi:自字子;zong:总;zou:走;zu:阻足卒组祖;zui:最;zun:尊遵;zuo:左作做昨';
  var _pyCharMap = null;
  function pinyinCharMap() {
    if (_pyCharMap) return _pyCharMap;
    var map = {};
    PY_TABLE.split(';').forEach(function (seg) {
      var i = seg.indexOf(':');
      if (i < 0) return;
      var syl = seg.slice(0, i);
      var chars = seg.slice(i + 1);
      for (var k = 0; k < chars.length; k++) map[chars.charAt(k)] = syl;
    });
    _pyCharMap = map;
    return map;
  }

  /* 全拼：汉字转无声调拼音并连写；字母数字原样保留，标点与空格丢弃 */
  function toPinyin(text) {
    var map = pinyinCharMap();
    var s = String(text == null ? '' : text).toLowerCase();
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (map[ch]) out += map[ch];
      else if (/[a-z0-9]/.test(ch)) out += ch;
    }
    return out;
  }

  /* 首字母：字体 -> zt，番茄钟 -> fqz */
  function toPinyinInitials(text) {
    var map = pinyinCharMap();
    var s = String(text == null ? '' : text).toLowerCase();
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (map[ch]) out += map[ch].charAt(0);
      else if (/[a-z0-9]/.test(ch)) out += ch;
    }
    return out;
  }

  var _audioCtx = null;
  function getAudioContext() {
    if (!_audioCtx) {
      var Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
      if (!Ctx) return null;
      try { _audioCtx = new Ctx(); } catch (e) { return null; }
    }
    if (_audioCtx.state === 'suspended') {
      // 浏览器自动播放策略：仅在用户手势调用链中 resume 才会生效
      try { _audioCtx.resume(); } catch (e) {}
    }
    return _audioCtx;
  }

  return {
    VERSION: VERSION,
    pad2: pad2,
    localDateKey: localDateKey,
    parseLocalDate: parseLocalDate,
    addDays: addDays,
    clamp: clamp,
    pomodoroRemaining: pomodoroRemaining,
    stopwatchElapsed: stopwatchElapsed,
    splitHMS: splitHMS,
    daysUntil: daysUntil,
    formatDuration: formatDuration,
    recordSeconds: recordSeconds,
    toPinyin: toPinyin,
    toPinyinInitials: toPinyinInitials,
    getAudioContext: getAudioContext
  };
});
