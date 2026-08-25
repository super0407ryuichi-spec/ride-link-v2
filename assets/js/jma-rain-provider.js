(() => {
  const TILE_ROOT = 'https://www.jma.go.jp/bosai/jmatile/data/nowc';
  const FIVE_MINUTES = 5 * 60 * 1000;

  class JmaRainProvider {
    constructor({ probeTimeout = 5000 } = {}) {
      this.probeTimeout = probeTimeout;
      this.attribution = '気象庁「雨雲の動き」をもとに表示';
    }

    formatUtc(date) {
      const pad = (value) => String(value).padStart(2, '0');
      return [
        date.getUTCFullYear(),
        pad(date.getUTCMonth() + 1),
        pad(date.getUTCDate()),
        pad(date.getUTCHours()),
        pad(date.getUTCMinutes()),
        pad(date.getUTCSeconds())
      ].join('');
    }

    createFrame(baseDate, offsetMinutes) {
      const validDate = new Date(baseDate.getTime() + offsetMinutes * 60 * 1000);
      const forecast = offsetMinutes > 0;
      const frameBase = forecast ? baseDate : validDate;
      return {
        id: this.formatUtc(frameBase) + '-' + this.formatUtc(validDate),
        baseTime: this.formatUtc(frameBase),
        validTime: this.formatUtc(validDate),
        date: validDate,
        offsetMinutes,
        kind: offsetMinutes < 0 ? 'observed' : offsetMinutes === 0 ? 'analysis' : 'forecast'
      };
    }

    getTileUrl(frame) {
      return [
        TILE_ROOT,
        frame.baseTime,
        'none',
        frame.validTime,
        'surf',
        'hrpns',
        '{z}',
        '{x}',
        '{y}.png'
      ].join('/');
    }

    probeBaseTime(baseDate) {
      const frame = this.createFrame(baseDate, 0);
      const url = this.getTileUrl(frame)
        .replace('{z}', '4')
        .replace('{x}', '14')
        .replace('{y}', '6');

      return new Promise((resolve) => {
        const image = new Image();
        let settled = false;
        const finish = (available) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          image.onload = null;
          image.onerror = null;
          resolve(available);
        };
        const timer = window.setTimeout(() => finish(false), this.probeTimeout);
        image.onload = () => finish(true);
        image.onerror = () => finish(false);
        image.decoding = 'async';
        image.src = url;
      });
    }

    async findLatestBaseTime(now = new Date()) {
      const rounded = new Date(Math.floor(now.getTime() / FIVE_MINUTES) * FIVE_MINUTES);
      for (const delayMinutes of [0, 5, 10, 15]) {
        const candidate = new Date(rounded.getTime() - delayMinutes * 60 * 1000);
        if (await this.probeBaseTime(candidate)) return candidate;
      }
      throw new Error('JMA_LATEST_FRAME_UNAVAILABLE');
    }

    async getFrames(now = new Date()) {
      const baseDate = await this.findLatestBaseTime(now);
      const frames = [];
      for (let offset = -60; offset <= 60; offset += 5) {
        frames.push(this.createFrame(baseDate, offset));
      }
      return {
        baseDate,
        frames,
        attribution: this.attribution
      };
    }
  }

  window.JmaRainProvider = JmaRainProvider;
})();
