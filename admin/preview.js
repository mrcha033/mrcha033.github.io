// The admin page's preview pane, drawn with the site's stylesheet and the article page's markup, so a
// post looks as it will on the site.
CMS.registerPreviewStyle('/assets/style.css');
// Each page of the site carries its own Korean subset; the preview, like the editor, takes the whole font
// in slices instead (ko-font.css).
CMS.registerPreviewStyle('/admin/ko-font.css');
// The editor wraps the text in containers of its own, so the article's spacing is applied to them
// here; an image on a line of its own is shown on a plate, as build.py sets it.
CMS.registerPreviewStyle(`
  .preview-draft { margin-bottom: var(--space-4); color: var(--accent); }
  .article-body [data-rich-text-preview] > :is(p, h2, h3, ul, ol, blockquote, hr) { max-width: var(--measure); }
  .article-body [data-rich-text-preview] > * + :not(h2, h3, hr) { margin-top: var(--space-5); }
  .article-body [data-rich-text-preview] > h3 + * { margin-top: var(--space-3); }
  .article-body [data-rich-text-preview] > hr + * { margin-top: var(--space-7); }
  .article-body :is([data-rich-text-preview] > img, p > img:only-child) { display: block; width: 100%; height: auto; max-height: 80vh; object-fit: contain; padding: var(--space-5) var(--space-6); border: 1px solid var(--line); outline: 1px solid var(--line); outline-offset: -.4375rem; background: var(--grain), var(--paper-deep); }
`, { raw: true });

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function longDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return m ? `${MONTHS[m[2] - 1]} ${Number(m[3])}, ${m[1]}` : '';
}

CMS.registerPreviewTemplate('writing', createClass({
  render() {
    const { entry, widgetFor } = this.props;
    const data = (key) => entry.getIn(['data', key]);
    const lang = data('lang') === 'ko' ? 'ko' : 'en';
    return h('div', { className: 'wrap' },
      h('header', { className: 'page-intro article-heading' },
        data('draft') ? h('p', { className: 'label preview-draft', lang: 'ko' }, '초안: 사이트에 올라가지 않습니다') : null,
        h('p', { className: 'label label-pair' },
          h('span', null, data('category') || 'Note'),
          h('span', { className: 'sep', 'aria-hidden': 'true' }, ' · '),
          h('span', null, longDate(data('date')))),
        h('h1', { lang }, data('title') || ''),
        data('summary') ? h('p', { className: 'lede', lang }, data('summary')) : null),
      h('div', { className: 'article-grid' },
        h('aside', { className: 'article-meta' }, h('p', { className: 'article-byline' }, h('span', null, 'Yunmin Cha'))),
        h('div', { className: 'article-body', lang }, widgetFor('body'))));
  },
}));
