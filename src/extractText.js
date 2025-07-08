import { load } from "cheerio";

export const extractTextFromHtml = (html) => {
  const $ = load(html);
  $('style, script, noscript, iframe, link, meta, head, svg, title, comment').remove();
  $('[style]').removeAttr('style');

  $('*').contents().each(function () {
    if (this.type === 'comment') $(this).remove();
  });

  let text = $('body').text().replace(/\s+/g, ' ').trim();
  return text.length > 2000 ? text.slice(0, 2000) + '…' : text;
};
