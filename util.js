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

  var VERSION = '1.9.5';

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
  var PY_TABLE = 'ai:挨爱矮;an:安按暗案;ao:熬;ba:吧把;bai:白百败;ban:办半板版;bang:帮绑;bao:保包宝抱薄;bei:倍北备悲焙背被;ben:奔本;bi:壁必比毕碧避闭;bian:便变扁编辨边遍;biao:标表;bie:别;bing:并柄病;bo:博播泊玻钵;bu:不布步补部;cai:才材菜裁采;can:参残;cang:沧藏;cao:操;ce:侧册测策;ceng:层曾;cha:差查;chan:产禅;chang:场常长;chao:潮超;che:彻撤车;chen:尘晨沉衬;cheng:乘呈城成承撑称程诚;chi:吃尺持斥迟;chong:充冲;chou:抽;chu:储出初处楚触除;chuan:串传船;chuang:创窗;chui:垂;chun:春纯;chuo:戳;ci:刺次此词;cong:从;cou:凑;cu:促粗;cui:脆;cun:存寸村;cuo:蹉错;da:大打答达;dai:代带待怠;dan:但单担淡;dang:当挡档;dao:倒到导道;de:得德的;deng:灯等;di:低地底抵滴笛第迪;dian:典点电;diao:掉;die:叠;ding:定顶;diu:丢;dong:东冬冻动;dou:兜抖斗都;du:度杜渡独笃读;duan:断段短端;dui:对队;duo:多朵;er:二儿尔而迩;fa:发法;fan:凡反帆泛番繁翻范返;fang:仿妨放方访防;fei:废非;fen:份分奋氛粉;feng:缝锋风;fou:否;fu:付俯副复幅服浮父符腹覆负赋赴辅;gai:改盖该;gan:干感敢赶;gao:高;ge:个各格隔;gei:给;gen:根跟;geng:更;gong:供公共功工弓拱躬;gou:勾构沟篝苟;gu:古固故辜顾;gua:挂;guan:关官管观;guang:光;gui:归规贵轨;gun:滚;guo:国果过;hai:海还;han:函含寒憾汉汗;hang:航;hao:号好皓;he:何合和核;hei:黑;hen:很痕;heng:恒横衡;hong:弘烘红鸿;hou:厚后;hu:乎互呼忽户糊;hua:化华滑画花话;huai:坏;huan:唤换欢环缓;huang:晃荒谎黄;hui:会回恢悔毁绘辉;hun:昏混;huo:或活火霍;ji:几击即及基寂寄己急技挤既机极济积级继计记辑迹际集饥鸡;jia:价加架;jian:件健兼减剑剪坚建渐监简荐见谏键间;jiang:将江降;jiao:交焦胶脚角较;jie:截捷接洁界皆结节解阶;jin:仅今劲尽津浸禁筋紧近进金;jing:净境径景竞精经镜静;jiu:久九就旧;ju:具句局居惧拒据聚距;juan:捐;jue:决绝觉;jun:君均;ka:卡;kai:开;kan:槛看瞰;kao:考靠;ke:刻可壳客棵科颗;kong:控空;kou:口;ku:库苦;kua:跨;kuai:块快;kuan:宽;kuang:况框;kui:跬;kun:坤;kuo:廓扩括;la:拉蜡;lai:来莱赖;lan:兰懒拦栏蓝览;lang:朗浪;lao:老;le:乐;lei:类累;li:例利力励历理璃砺礼离立粒里;lian:联连链;liang:两亮量;liao:了;lie:列;lin:临;ling:凌另岭灵铃零;liu:六刘柳流浏留;long:拢;lou:楼漏镂;lu:录炉芦路露;luan:乱;lun:论轮;luo:络罗落逻;ma:吗码马;man:慢曼满漫;mang:芒;mao:冒毛貌锚;me:么;mei:媒梅每没美;men:们门;meng:梦蒙;mi:密谧迷;mian:免勉眠面;miao:描秒;ming:名命明;mo:墨寞摸末模磨莫默;mou:某;mu:姆幕木母目;na:哪纳那;nai:耐;nan:南男难;nang:囊;ne:呢;nei:内;neng:能;ni:你匿尼拟逆;nian:年念;nie:捏;ning:凝宁;niu:钮;nu:努;nuan:暖;ou:偶;pa:啪帕怕;pai:拍排;pan:判畔盘;pao:抛;pei:培配;pen:盆;pi:僻匹噼皮;pian:偏片;piao:漂飘;pin:拼频;ping:屏平;po:破;pu:普铺;qi:七其启器弃憩期气起齐;qian:乾前千嵌浅签迁;qiang:墙强;qiao:乔;qie:且切茄锲;qin:勤;qing:倾情擎晴清请轻;qiong:穷;qiu:求裘;qu:区去取渠趋驱;quan:全圈权;que:确缺;ran:染然;rang:让;rao:扰;re:热;ren:人任忍认;reng:仍;ri:日;rong:容;rou:柔;ru:入如;rui:锐;run:润;ruo:若;sai:塞;san:三散;sang:桑;se:色;sha:杀沙;shan:删善山闪;shang:上伤尚;shao:少稍韶;she:射舍设;shen:什伸深身;sheng:剩升声生盛省;shi:世事使势十史士失始实室市式时是湿矢石示视识试诗适释;shou:受守手收首;shu:书属数术束树疏竖署舒输述鼠;shua:刷;shuang:双;shui:水谁;shun:瞬顺;shuo:烁说;si:丝似四思斯死;song:送颂;sou:搜;su:素速;suan:算;sui:岁随;suo:所索缩;ta:他塔它;tai:台太态;tan:弹探;tang:唐;tao:套;te:特;teng:腾;ti:体屉提替题;tian:填天添田;tiao:条调跳;tie:贴;ting:停听;tong:同桶统通铜;tou:头投透;tu:图徒突途;tui:推腿退;tuo:托拖脱跎;wa:挖;wai:外;wan:万完挽晚;wang:往忘望王网;wei:为伟伪位唯围尾微未维苇;wen:文温稳纹问;wo:我;wu:五兀务吾悟无物舞芜误雾;xi:习兮吸喜嬉希息晰析汐系细西隙;xia:下夏霞;xian:先弦显现线羡闲限险陷;xiang:享像向响想橡相详项香;xiao:小效校消销;xie:些写懈泄;xin:信心新;xing:型幸形性星行醒;xiong:雄;xiu:休修;xu:序绪续虚许需须;xuan:悬旋渲选;xue:学雪;xun:循询;ya:压涯;yan:延沿眼研衍言颜验;yang:仰央样;yao:要;ye:业也夜腋野页;yi:一义以依已异意易毅溢疑益移议遗;yin:因引阴隐音;ying:应影映硬英萤;yong:勇拥永用;you:优又右有由;yu:与于余域愚榆欲玉语雨预鱼;yuan:元原圆怨愿渊源缘远;yue:月约越;yun:云允匀运;za:杂;zai:再在载;zan:暂;zao:噪早造;ze:则择责;zen:怎;zeng:增;zhai:摘窄;zhan:占展站;zhang:丈张章;zhao:找照罩;zhe:折着者这遮;zhen:帧真针;zheng:争挣整正蒸证;zhi:之值制只址志执指支止治直知纸置职至致质;zhong:中众种终重钟;zhou:周舟轴;zhu:主住助柱注烛珠筑逐驻;zhuan:专转;zhuang:壮状装;zhui:追;zhun:准;zhuo:卓桌;zi:子字自资;zong:总棕纵;zou:奏走;zu:卒祖组足阻;zui:最;zun:尊遵;zuo:作做坐左昨';
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
