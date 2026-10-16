// Bold, italic, or struck text that ends in punctuation and is followed straight by a Korean particle
// (**"가을"**이라는, **100%**의, *기울임(italic)*은) is set so on the site, since build.py reads a Hangul
// letter beside such a mark as punctuation. The admin page reads Markdown twice, and neither reading
// does this: the editor reads it with Lexical, and the preview with marked. Both follow CommonMark,
// though Lexical counts only ASCII characters as punctuation.
//
// The editor therefore opens such a post with the marks as plain text, and saving it then escapes them
// (\*\*"가을"\*\*이라는), which would print the asterisks on the site. Before each save, escaped marks
// that the site would read as marks but the editor would not become marks again. Marks the author
// escaped on purpose, which the editor would read as marks if unescaped, stay escaped. The preview
// does the same, then draws as HTML the marks that the site reads and marked does not, so it shows
// the post as the site will. Code spans, fenced code, and HTML tags are left as they are. The rules
// follow scan_delims in build.py.

const CJK = /[\u1100-\u11ff\u3040-\u30ff\u3130-\u318f\u3400-\u4dbf\u4e00-\u9fff\ua960-\ua97f\uac00-\ud7ff\uf900-\ufaff]/;
const QUOTE = '"\'`“‘«「『〈《';
const space = (c) => c === undefined || /\s/.test(c);
// The three readers: build.py, marked (the preview), and Lexical (the editor).
const unicode = (c) => /[\p{P}\p{S}]/u.test(c);
const SITE = { punct: unicode, cjk: true };
const PREVIEW = { punct: unicode, cjk: false };
const EDITOR = { punct: (c) => /[!-/:-@[-`{-~]/.test(c), cjk: false };
// Whether a reader takes a run of marks between a and x as opening, and one between y and b as closing.
const opens = (a, x, { punct, cjk }) => !space(x) && (!punct(x) || space(a) || punct(a) || (cjk && CJK.test(a) && QUOTE.includes(x)));
const closes = (y, b, { punct, cjk }) => !space(y) && (!punct(y) || space(b) || punct(b) || (cjk && CJK.test(b) && !/[\p{Ps}\p{Pi}]/u.test(y)));
const reads = (a, inner, b, reader) => opens(a, after(inner, 0), reader) && closes(before(inner, inner.length), b, reader);
// The characters before and after position i, whole even outside the Basic Multilingual Plane (an emoji).
const before = (s, i) => [...s.slice(Math.max(0, i - 2), i)].at(-1);
const after = (s, i) => [...s.slice(i, i + 2)][0];

// Change each pair of marks that `re` finds and `accept` takes. Like build.py, a closing run pairs with the
// nearest opening one: the text between holds no run of the same marks, and a rejected pair is tried again
// from just after its opening run.
function pairs(text, re, accept, change) {
  let out = '', last = 0, m;
  re.lastIndex = 0;
  while ((m = re.exec(text))) {
    const [match, mark, inner] = m, i = m.index;
    if (!accept(before(text, i), inner, after(text, i + match.length))) {
      re.lastIndex = i + mark.length;
      continue;
    }
    out += text.slice(last, i) + change(mark, inner);
    last = i + match.length;
  }
  return out + text.slice(last);
}

// Escaped runs of marks, whole (\*\*\* is one run, not \* around \*).
const ESCAPED = /(?<!\\|\\[*~])(\\\*\\\*\\\*|\\\*\\\*|\\~\\~|\\\*)(?!\\[*~])(?=\S)((?:(?!\1)[^\n])*?[^\s\\])\1(?!\\[*~])/g;
const unescapeMarks = (text) => pairs(text, ESCAPED, (a, inner, b) => reads(a, inner, b, SITE) && !reads(a, inner, b, EDITOR),
  (mark, inner) => mark.replaceAll('\\', '') + inner + mark.replaceAll('\\', ''));

// A pair of marks in the preview does not cross a table cell's |.
const MARKS = /(?<![\\*~])(\*\*\*|\*\*|~~|\*)(?![\s*~])((?:(?!\1)[^\n|])*?[^\s\\*~|])\1(?![*~])/g;
const TAG = { '***': ['<em><strong>', '</strong></em>'], '**': ['<strong>', '</strong>'], '*': ['<em>', '</em>'], '~~': ['<s>', '</s>'] };
const tagMarks = (text) => pairs(text, MARKS, (a, inner, b) => reads(a, inner, b, SITE) && !reads(a, inner, b, PREVIEW),
  (mark, inner) => TAG[mark][0] + inner + TAG[mark][1]);

// Apply a change to the text around code spans, fenced code, and HTML tags (an autolink among them), which
// are kept as they are. Each is set aside for a placeholder with the same first and last character, so that
// marks around it, as in **`git rebase`**는, are read as they are around it. A fence left open runs to the
// end, as in CommonMark; a code span does not start at an escaped backtick or run past a blank line.
const KEPT = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[`~]*[ \t]*$|(?![\s\S]))|(?<!\\)(`+)(?!`)(?:(?!\n[ \t]*\n)[\s\S])*?(?<!`)\2(?!`)|<[A-Za-z/][^<>\n]*>/gm;
function outsideCode(markdown, change) {
  const kept = [];
  const masked = markdown.replace(KEPT, (m, fence) => {
    // A placeholder stands for a fenced block whole, and for what lies between the first and last character
    // of a code span or tag.
    kept.push(fence ? m : m.slice(1, -1));
    const token = `\uE000${kept.length - 1}\uE001`;
    return fence ? token : m[0] + token + m.at(-1);
  });
  return change(masked).replace(/\uE000(\d+)\uE001/g, (t, i) => kept[i] ?? t);
}
const keepMarks = (markdown) => outsideCode(markdown, unescapeMarks);
const previewMarks = (markdown) => outsideCode(markdown, (text) => tagMarks(unescapeMarks(text)));

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
// The CMS shares its marked with the page, and the preview of the text is drawn with it.
if (typeof window !== 'undefined' && window.marked) window.marked.use({ hooks: { preprocess: previewMarks } });
if (typeof module !== 'undefined') module.exports = { keepMarks, previewMarks };
