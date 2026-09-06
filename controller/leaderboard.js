export class LeaderboardClient {
  constructor(fetcher = (...args) => fetch(...args)) { this.fetcher = fetcher; }
  async request(body) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await this.fetcher('/.netlify/functions/leaderboard', { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The leaderboard is available on the live site. You can still play here.');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The leaderboard is unavailable. Please try again.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Could not reach the leaderboard. Please try again.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  start() { return this.request({ action: 'start' }); }
  submit(roundId, nickname, result) { return this.request({ action: 'submit', roundId, nickname, result }); }
  list() { return this.request(); }
}

export class LeaderboardView {
  constructor({ client, onOpen, onClose, onAction = () => {} }) {
    this.client = client; this.onOpen = onOpen; this.onClose = onClose; this.onAction = onAction;
    this.dialog = document.getElementById('leaderboard'); this.request = 0;
    document.getElementById('leaderboard-close').addEventListener('click', () => this.dialog.close());
    document.getElementById('leaderboard-refresh').addEventListener('click', () => this.load());
    this.dialog.addEventListener('close', () => { this.request++; this.onClose(); });
  }
  get isOpen() { return this.dialog.open; }
  open() { document.getElementById('leaderboard-close').textContent = document.getElementById('range')?.open ? 'Back to game' : 'Back to controller'; this.onOpen(); this.dialog.showModal(); this.onAction('leaderboard', 'opened'); void this.load(); }
  element(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  weapons(entry) { return entry.weapons.map(mode => ({ shooting: 'Pistol', shotgun: 'Shotgun', lmg: 'LMG', smg: 'SMG' })[mode]).join(' + '); }
  podium(entry) {
    const card = this.element('section', 'leaderboard-podium-card');
    card.dataset.rank = entry.rank;
    const medal = this.element('span', 'leaderboard-medal', entry.rank === 1 ? '01' : `0${entry.rank}`);
    medal.setAttribute('aria-hidden', 'true');
    const name = this.element('h3', 'leaderboard-podium-name', entry.nickname);
    if (entry.mine) name.append(this.element('span', 'leaderboard-you', 'You'));
    const detail = this.element('p', 'leaderboard-podium-detail', `${entry.accuracy}% accuracy`);
    detail.append(this.element('span', '', this.weapons(entry)));
    card.append(medal, this.element('span', 'leaderboard-place', ['FIRST PLACE', 'SECOND PLACE', 'THIRD PLACE'][entry.rank - 1]), name, this.element('strong', 'leaderboard-podium-score', entry.score.toLocaleString()), detail);
    return card;
  }
  row(entry) {
    const row = this.element('tr', entry.mine ? 'your-score' : '');
    const rank = this.element('td', 'leaderboard-rank' + (entry.rank <= 3 ? ' top-rank' : ''));
    rank.append(this.element('span', '', '#'), document.createTextNode(entry.rank));
    const player = this.element('th', ''); player.scope = 'row';
    const identity = this.element('span', 'leaderboard-player');
    const avatar = this.element('span', 'leaderboard-avatar', [...entry.nickname][0]?.toLocaleUpperCase() || '·'); avatar.setAttribute('aria-hidden', 'true');
    const name = this.element('span', 'leaderboard-player-name', entry.nickname);
    if (entry.mine) name.append(this.element('span', 'leaderboard-you', 'You'));
    name.append(this.element('span', 'leaderboard-mobile-weapon', this.weapons(entry)));
    identity.append(avatar, name); player.append(identity);
    const accuracy = this.element('td', 'leaderboard-accuracy', `${entry.accuracy}%`);
    const track = this.element('span', 'leaderboard-accuracy-track'); track.setAttribute('aria-hidden', 'true');
    const fill = this.element('i', ''); fill.style.width = `${Math.max(0, Math.min(100, entry.accuracy))}%`; track.append(fill); accuracy.append(track);
    const weapon = this.element('td', 'leaderboard-weapon-column'); weapon.append(this.element('span', 'leaderboard-loadout', this.weapons(entry)));
    row.append(rank, player, this.element('td', 'leaderboard-score', entry.score.toLocaleString()), accuracy, weapon);
    return row;
  }
  personal(entry) {
    const personal = document.getElementById('leaderboard-personal'); personal.replaceChildren();
    const copy = this.element('div', 'leaderboard-personal-copy');
    if (entry) {
      const rank = this.element('button', 'leaderboard-personal-rank', `#${entry.rank}`);
      rank.setAttribute('aria-label', `Find your rank, number ${entry.rank}`);
      rank.addEventListener('click', () => this.dialog.querySelector('.your-score')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const title = this.element('strong', '', 'Your best '); title.append(this.element('span', '', `${entry.score.toLocaleString()} pts`));
      copy.append(title, this.element('small', '', `${entry.accuracy}% accuracy · ${this.weapons(entry)}`)); personal.append(rank);
    } else {
      copy.append(this.element('strong', '', 'Your next round could be the one.'), this.element('small', '', 'Finish a round and submit your score to join the top 50.'));
    }
    personal.append(copy);
  }
  placeholder(heading, description) {
    document.getElementById('leaderboard-placeholder').hidden = false;
    document.getElementById('leaderboard-state-heading').textContent = heading;
    document.getElementById('leaderboard-state-description').textContent = description;
  }
  async load() {
    const request = ++this.request;
    const status = document.getElementById('leaderboard-status'), refresh = document.getElementById('leaderboard-refresh');
    status.textContent = 'Loading the leaderboard…'; refresh.disabled = true;
    const body = document.getElementById('leaderboard-rows'); body.replaceChildren();
    const podium = document.getElementById('leaderboard-podium'); podium.replaceChildren(); podium.hidden = true;
    const standings = document.getElementById('leaderboard-standings'); standings.hidden = true;
    const content = document.getElementById('leaderboard-content'); content.setAttribute('aria-busy', 'true');
    document.getElementById('leaderboard-personal').replaceChildren(this.element('span', 'leaderboard-personal-copy', '20 seconds to make your mark.'));
    this.placeholder('Lining up the scores', 'The next spot could be yours.');
    try {
      const { entries } = await this.client.list();
      if (request !== this.request || !this.isOpen) return;
      if (entries.length) {
        const leaders = entries.filter(entry => entry.rank <= 3);
        podium.append(...leaders.map(entry => this.podium(entry))); podium.dataset.count = leaders.length; podium.hidden = !leaders.length;
        body.append(...entries.map(entry => this.row(entry))); standings.hidden = false;
        document.getElementById('leaderboard-count').textContent = `${entries.length} ranked ${entries.length === 1 ? 'score' : 'scores'}`;
        document.getElementById('leaderboard-placeholder').hidden = true;
      } else {
        this.placeholder('The first spot is yours to take.', 'Finish a 20-second round, submit your score, and set the pace.');
      }
      const mine = entries.find(entry => entry.mine); this.personal(mine);
      status.textContent = entries.length ? `${entries.length} ranked scores loaded.${mine ? ` Your best score is number ${mine.rank}.` : ''}` : 'The board is waiting for its first score. Finish a round and claim your place.';
    } catch (error) {
      if (request === this.request && this.isOpen) { this.placeholder('Scores are taking a breather.', error.message); status.textContent = error.message; }
    } finally { if (request === this.request) { refresh.disabled = false; content.setAttribute('aria-busy', 'false'); } }
  }
}
