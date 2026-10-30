// One post on one canvas, for engine-src/make.mjs (through desk-src/render.mjs):
//   setup(job)      builds the post from its facts with the studio (vendor/studio.js);
//                   what it made stays in window.MADE (size, length, caption, title)
//   renderFrame(t)  draws the still (t ignored) or the video's frame at t seconds
//   lint()          the app's word list over every drawn word and the caption
(() => {
  const S = window.ClutchStudio;
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false });
  const drawn = new Set();
  const fill = ctx.fillText.bind(ctx);
  ctx.fillText = (t, x, y, m) => {
    drawn.add(String(t));
    return m === undefined ? fill(t, x, y) : fill(t, x, y, m);
  };
  let scene = null;
  let caption = null;

  const sealOf = (row) => (row ? S.seal(row) : null);

  function build(job) {
    const f = job.facts;
    // the short words fit an X post with its link, and Bluesky's 300 with the link make.mjs gives
    const limit = Math.min(S.X_ROOM_WITH_LINK, job.limit ?? Infinity);
    switch (job.series) {
      case "tonight": {
        const n = S.buildTonight(job.date, f.slate);
        return { post: S.tonightPost(n, { gotnId: f.gotnId, seal: sealOf(f.seal) }), caption: S.tonightCaption(n, limit), title: `${n.games.length} games` };
      }
      case "gotn": {
        // f.runs: who won each run, from the content-gotn function (the dots need nothing else);
        // f.sim: the full runs, for the board / lines looks (local samples only)
        const look = f.runs ? "dots" : job.look ?? "dots";
        const sealedAt = sealOf(f.seal)?.at ?? null;
        const g = f.runs
          ? S.gotnFromWinners(job.date, S.studioGame(f.game), f.runs, sealedAt)
          : S.buildGotn(job.date, S.studioGame(f.game), f.sim, { sealedAt, finals: look !== "dots", worms: look === "lines" });
        return { post: S.gotnPost(g, look), caption: S.gotnCaption(g, limit), title: `${g.game.awayAbbr} @ ${g.game.homeAbbr}` };
      }
      case "receipts": {
        const n = S.buildNight(job.date, f.calls);
        return { post: S.receiptsPost(n, sealOf(f.seal)), caption: S.receiptsCaption(n, sealOf(f.seal), limit), title: `${n.right} of ${n.total} right` };
      }
      case "moved": {
        const m = { ...f.moved, date: job.date, game: S.studioGame(f.game), sealedAt: sealOf(f.seal)?.at ?? null };
        return { post: S.movedPost(m), caption: S.movedCaption(m, limit), title: `${m.player} ${m.status}` };
      }
      case "week": {
        const w = S.buildWeek(job.date, f.calls);
        return { post: S.weekPost(w), caption: S.weekCaption(w, limit), title: `${w.right} of ${w.total} right` };
      }
      default:
        throw new Error(`unknown series ${job.series}`);
    }
  }

  window.setup = async (job) => {
    await S.abFontsReady();
    await document.fonts.ready;
    const made = build(job);
    if (!made.post) return (window.MADE = { empty: true });
    scene = job.part === "reel" ? made.post.reel : made.post.still;
    caption = made.caption;
    canvas.width = scene.w;
    canvas.height = scene.h;
    window.DURATION = scene.duration;
    window.STILL = scene.duration ? scene.poster : 0;
    return (window.MADE = { w: scene.w, h: scene.h, duration: scene.duration, poster: scene.poster, file: scene.file, caption, title: made.title });
  };

  window.renderFrame = (t) => {
    if (!scene) return false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    scene.draw(ctx, scene.duration ? t : 0);
    return true;
  };

  window.lint = () => {
    const words = [...drawn];
    return { drawn: S.bettingWordsIn(words.join(" \n ")), caption: S.bettingWordsIn(`${caption.short}\n${caption.long}`), words };
  };
})();
