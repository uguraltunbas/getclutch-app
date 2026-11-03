// /unsubscribe/: where an e-mail's unsubscribe link lands. The email-unsubscribe function
// (monorepo supabase/functions) sends a reader here with the token in the fragment, and the
// button (static/unsubscribe.js) sends it back by POST. Not indexed, not in the sitemap.

import { page, esc } from "../html.mjs";
import { SUPPORT_EMAIL } from "../../content/legal.mjs";

// English first, Turkish under it, as the e-mails' readers get them.
const WORDS = {
  none: "This page needs the link from a Clutch e-mail. Open it from the e-mail's footer, or reply STOP to any Clutch e-mail. · Bu sayfa bir Clutch e-postasındaki bağlantıyla açılır. E-postanın altındaki bağlantıyı kullan ya da herhangi bir Clutch e-postasını DUR yazarak yanıtla.",
  wait: "One moment… · Bir saniye…",
  done: "You're unsubscribed. Clutch won't e-mail you again. · Aboneliğin iptal edildi. Clutch sana bir daha e-posta göndermeyecek.",
  bad: "This unsubscribe link isn't valid. Reply STOP to any Clutch e-mail and you won't get another. · Bu bağlantı geçerli değil. Herhangi bir Clutch e-postasını DUR yazarak yanıtla, bir daha gelmez.",
  again: "That didn't go through. Please try again in a minute. · Olmadı. Bir dakika sonra yeniden dene.",
};

export function unsubscribePage() {
  const path = "/unsubscribe/";
  const title = "Unsubscribe · Clutch";
  const data = Object.entries(WORDS).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ");
  const body = `<div class="wrap r"><div class="rhead"><span class="kick">E-mail</span><h1 class="rh1">Stop Clutch e-mails?</h1><p class="rdeck">One tap below and Clutch won't e-mail you again. Your account and your calls stay as they are.</p><p class="rdeck" lang="tr">Aşağıdaki düğmeye bas, Clutch sana bir daha e-posta göndermesin. Hesabın ve tahminlerin olduğu gibi kalır.</p>
<div class="unbox" id="un" ${data}><div class="btns"><button class="btn" id="un-go" type="button" hidden>Unsubscribe · Abonelikten çık</button></div><p id="un-out" role="status" aria-live="polite"></p>
<noscript><p>This button needs JavaScript. Reply STOP to any Clutch e-mail instead, or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p></noscript></div></div></div>`;
  return { path, title, noindex: true, html: page({ path, title, description: "Stop Clutch's e-mails with one tap.", body, noindex: true, unsubscribe: true }) };
}
