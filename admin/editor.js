// Bold, italic, or struck text that ends in punctuation and is followed straight by a Korean particle
// (**"가을"**이라는, **100%**의, *기울임(italic)*은) is set so on the site, since build.py reads a Hangul
// letter beside such a mark as punctuation. The editor follows CommonMark, which does not: it opens such a
// post with the marks as plain text, and saving it then escapes them (\*\*"가을"\*\*이라는), which would
// print the asterisks on the site. Before each save, escaped marks that the site would read as marks but
// CommonMark would not become marks again. Marks the author escaped on purpose, which CommonMark would read
// as marks if unescaped, stay escaped, and code is left as it is. The rules follow scan_delims in build.py.

const CJK = /[\u1100-\u11ff\u3040-\u30ff\u3130-\u318f\u3400-\u4dbf\u4e00-\u9fff\ua960-\ua97f\uac00-\ud7ff\uf900-\ufaff]/;
const QUOTE = '"\'`“‘«「『〈《';
const space = (c) => c === undefined || /\s/.test(c);
const punct = (c) => /[\p{P}\p{S}]/u.test(c);
// Whether a run of marks before x (after a) can open, and one after y (before b) can close; with cjk, as
// build.py reads them.
const opens = (a, x, cjk) => !space(x) && (!punct(x) || space(a) || punct(a) || (cjk && CJK.test(a) && QUOTE.includes(x)));
const closes = (y, b, cjk) => !space(y) && (!punct(y) || space(b) || punct(b) || (cjk && CJK.test(b) && !/[\p{Ps}\p{Pi}]/u.test(y)));

function unescapeMarks(text) {
  return text.replace(/(?<!\\)(\\\*\\\*|\\~\\~|\\\*)(?=\S)([^\n]*?\S)\1/g, (match, mark, inner, i, s) => {
    const a = s[i - 1], b = s[i + match.length], x = inner[0], y = inner.at(-1);
    const site = opens(a, x, true) && closes(y, b, true);
    const editor = opens(a, x, false) && closes(y, b, false);
    if (!site || editor) return match;
    const plain = mark.replaceAll('\\', '');
    return plain + inner + plain;
  });
}

// The text outside code: fenced blocks and inline code spans are kept as they are.
const CODE = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$|(`+)(?!`)[\s\S]*?(?<!`)\2(?!`)/gm;
function keepMarks(markdown) {
  let out = '', last = 0;
  for (const m of markdown.matchAll(CODE)) {
    out += unescapeMarks(markdown.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + unescapeMarks(markdown.slice(last));
}

if (typeof CMS !== 'undefined') {
  CMS.registerEventListener({
    name: 'preSave',
    handler: ({ entry }) => {
      const body = entry.getIn(['data', 'body']);
      if (typeof body !== 'string') return undefined;
      const kept = keepMarks(body);
      return kept === body ? undefined : entry.get('data').set('body', kept);
    },
  });
}
if (typeof module !== 'undefined') module.exports = { keepMarks };
