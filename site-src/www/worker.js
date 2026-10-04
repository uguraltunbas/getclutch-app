// www → apex, permanently, keeping the path and the query.
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = "clutchledger.com";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  },
};
