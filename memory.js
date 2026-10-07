/* Session-only practice: no progress, scores or persistent collections. */
(() => {
  const hardByArticle = new Map();
  let enabled = false, units = [], position = 0, revealed = false;
  let automatic = false, timer = 0, internalStart = false, phase = '', playingIndex = -1;
  const panel = $('memory-panel');
  const el = (tag, text, cls) => node(tag, cls || '', text);
  const message = text => { $('memory-status').textContent = text; };
  const hard = () => {
    if (!hardByArticle.has(DATA.id)) hardByArticle.set(DATA.id, new Set());
    return hardByArticle.get(DATA.id);
  };
  function cancel() {
    clearTimeout(timer); automatic = false; phase = ''; playingIndex = -1;
    $('memory-auto').textContent = '开始跟读';
  }
  document.addEventListener('point-stop', () => { if (!internalStart) { const wasRunning = phase !== ''; cancel(); if (enabled && wasRunning) message('已停止播放。'); } });
  function normalized(s) { return s.replace(/\s+/g, ''); }
  function paragraphUnits() {
    const result = []; let cursor = 0;
    for (const paragraph of study[DATA.id].original) {
      const text = normalized(paragraph.korean), indexes = [];
      while (cursor < DATA.sentences.length && text.includes(normalized(DATA.sentences[cursor].korean))) indexes.push(cursor++);
      if (indexes.length) {
        // Long paragraphs become small, speakable chunks of at most four sentences.
        for (let j = 0; j < indexes.length; j += 4) result.push({ indexes: indexes.slice(j, j + 4), speaker: paragraph.speaker || '' });
      }
    }
    while (cursor < DATA.sentences.length) {
      const indexes = []; for (let j = 0; j < 3 && cursor < DATA.sentences.length; j++) indexes.push(cursor++);
      result.push({ indexes, speaker: '' });
    }
    return result;
  }
  function rebuild() {
    stop();
    units = $('memory-kind').value === 'paragraph' ? paragraphUnits() : DATA.sentences.map((s, i) => ({ indexes: [i], speaker: '' }));
    if ($('memory-hard-only').checked) units = units.filter(u => u.indexes.some(i => hard().has(i)));
    position = 0; render();
  }
  function render() {
    revealed = false;
    const unit = units[position], kind = $('memory-kind').value;
    const card = $('memory-card'); card.replaceChildren();
    $('memory-answer-toggle').textContent = '揭晓韩语';
    $('memory-auto').hidden = kind !== 'echo';
    $('memory-gap-label').hidden = kind !== 'echo';
    $('memory-answer-toggle').hidden = kind === 'echo';
    const instructions = {
      prompt: '看中文，先用韩语说出来，再揭晓原句。想不起时，可以先听一遍。',
      cloze: '根据中文和保留的韩语词语补全句子，再揭晓检查。',
      echo: '先听一句，利用停顿跟着说；自动跟读会依次播放本篇句子。',
      paragraph: '看这一小段的中文提示，尝试连贯背诵。揭晓后逐句核对。'
    };
    $('memory-help').textContent = instructions[kind];
    $('memory-previous').disabled = !unit || position === 0;
    $('memory-next').disabled = !unit || position === units.length - 1;
    for (const id of ['memory-listen', 'memory-answer-toggle', 'memory-hard', 'memory-auto']) $(id).disabled = !unit;
    $('memory-hard-count').textContent = '只练难句（' + hard().size + '）';
    message('');
    if (!unit) {
      $('memory-position').textContent = '暂无难句';
      card.append(el('p', '本篇还没有标记难句。取消“只练难句”，在练习中点“标为难句”即可。', 'memory-empty'));
      return;
    }
    const range = unit.indexes.map(i => i + 1);
    $('memory-position').textContent = (kind === 'paragraph' ? '第 ' + (position + 1) + ' / ' + units.length + ' 段' : '第 ' + (position + 1) + ' / ' + units.length + ' 句') + ' · 原文 ' + range[0] + (range.length > 1 ? '–' + range[range.length - 1] : '') + ' 句';
    if (unit.speaker) card.append(el('p', unit.speaker + '：', 'memory-label'));
    for (const i of unit.indexes) card.append(el('p', DATA.sentences[i].chinese, 'memory-cue'));
    const answer = el('div', '', 'memory-answer'); answer.id = 'memory-answer'; answer.lang = 'ko';
    for (const i of unit.indexes) {
      const p = el('p', '', '');
      if (kind === 'cloze') {
        const words = DATA.sentences[i].korean.split(/\s+/);
        words.forEach((word, j) => { p.append(j % 2 === 0 ? el('span', '＿＿＿', 'memory-mask') : document.createTextNode(word)); p.append(document.createTextNode(' ')); });
      } else p.textContent = DATA.sentences[i].korean;
      answer.append(p);
    }
    answer.hidden = kind !== 'cloze' && kind !== 'echo'; card.append(answer);
    const isHard = unit.indexes.every(i => hard().has(i));
    $('memory-hard').textContent = isHard ? '取消难句标记' : '标为难句';
    $('memory-hard').setAttribute('aria-pressed', String(isHard));
  }
  function switchView(value) {
    stop(); enabled = value;
    document.body.classList.toggle('memory-view', value);
    $('study-content').hidden = value; panel.hidden = !value;
    $('mode-reading').setAttribute('aria-pressed', String(!value));
    $('mode-memory').setAttribute('aria-pressed', String(value));
    $('translation').parentElement.hidden = value;
    $('analysis').parentElement.hidden = value;
    $('loop').parentElement.hidden = value;
    $('learning-intro').textContent = value ? '先看提示，尝试用韩语说出来，再揭晓和听原文检查。' : '点击任意韩语句子，听这一句。也可以连贯听完整篇，跟着高亮句子阅读。';
    if (value) { $('loop').checked = false; $('memory-speed').value = $('speed').value; rebuild(); }
  }
  function move(delta) { stop(); position = Math.max(0, Math.min(units.length - 1, position + delta)); render(); }
  async function listen(index) {
    phase = 'listening'; playingIndex = index;
    message('正在播放原文第 ' + (index + 1) + ' 句…');
    internalStart = true;
    const pending = playSentence(index); internalStart = false;
    await pending;
    if (mode === 'idle') { cancel(); message('音频未能播放，请点击“听原文”重试。'); }
  }
  function startUnit() {
    const unit = units[position]; if (!unit) return;
    stop(); automatic = true; $('memory-auto').textContent = '停止跟读';
    listen(unit.indexes[0]);
  }
  audio.addEventListener('sentencecomplete', event => {
    if (!enabled || phase !== 'listening' || event.detail !== playingIndex) return;
    phase = 'waiting';
    const kind = $('memory-kind').value, unit = units[position];
    if (!unit) return;
    const within = unit.indexes.indexOf(playingIndex), next = unit.indexes[within + 1];
    if (kind === 'echo') {
      const segment = track().segments[playingIndex];
      const seconds = $('memory-gap').value === 'auto' ? Math.max(3, Math.ceil((segment.end - segment.start) / Number($('speed').value) + 1)) : Number($('memory-gap').value);
      message('轮到你跟读 · 停顿 ' + seconds + ' 秒');
      if (automatic) timer = setTimeout(() => {
        if (!automatic || !enabled) return;
        if (position < units.length - 1) { position++; render(); $('memory-auto').textContent = '停止跟读'; listen(units[position].indexes[0]); }
        else { cancel(); message('本篇跟读完成。可以换一篇，或再练一次。'); }
      }, seconds * 1000);
    } else if (next !== undefined) timer = setTimeout(() => listen(next), 250);
    else message('本段原文已听完。试着自己说一遍。');
  });
  $('mode-reading').onclick = () => switchView(false);
  $('mode-memory').onclick = () => switchView(true);
  $('memory-kind').onchange = rebuild;
  $('memory-speed').onchange = () => { $('speed').value = $('memory-speed').value; audio.playbackRate = Number($('memory-speed').value); };
  $('memory-hard-only').onchange = rebuild;
  $('memory-previous').onclick = () => move(-1);
  $('memory-next').onclick = () => move(1);
  $('memory-answer-toggle').onclick = () => {
    const unit = units[position]; if (!unit) return;
    if (revealed) { stop(); render(); return; }
    revealed = true; const answer = $('memory-answer'); answer.replaceChildren();
    for (const i of unit.indexes) answer.append(el('p', DATA.sentences[i].korean));
    answer.hidden = false; $('memory-answer-toggle').textContent = '重新隐藏';
  };
  $('memory-listen').onclick = () => { if (!units[position]) return; stop(); listen(units[position].indexes[0]); };
  $('memory-stop').onclick = () => { stop(); message('已停止。可以重新听，或继续下一句。'); };
  $('memory-auto').onclick = () => { if (automatic) { stop(); message('跟读已停止。'); } else startUnit(); };
  $('memory-hard').onclick = () => {
    const unit = units[position]; if (!unit) return;
    const remove = unit.indexes.every(i => hard().has(i));
    unit.indexes.forEach(i => remove ? hard().delete(i) : hard().add(i));
    if ($('memory-hard-only').checked && remove) { rebuild(); return; }
    $('memory-hard-count').textContent = '只练难句（' + hard().size + '）';
    $('memory-hard').textContent = remove ? '标为难句' : '取消难句标记';
    $('memory-hard').setAttribute('aria-pressed', String(!remove));
  };
  const originalRender = renderStudy;
  renderStudy = function(a) { originalRender(a); if (enabled) switchView(true); else { $('study-content').hidden = false; panel.hidden = true; } };
  // Leaving the article for the grammar browser cancels timers via point-stop.
})();
