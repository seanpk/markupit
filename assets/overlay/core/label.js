// Human label for an annotation in the queue (QUE-2): a friendly noun for the element's
// role plus its snippet — never a raw selector or internal id (UX-6). PURE.

const NOUNS = {
  h1: 'Heading',
  h2: 'Heading',
  h3: 'Heading',
  h4: 'Heading',
  h5: 'Heading',
  h6: 'Heading',
  p: 'Paragraph',
  a: 'Link',
  button: 'Button',
  img: 'Image',
  picture: 'Image',
  svg: 'Graphic',
  ul: 'List',
  ol: 'List',
  li: 'List item',
  nav: 'Navigation',
  header: 'Header',
  footer: 'Footer',
  main: 'Main content',
  section: 'Section',
  article: 'Article',
  aside: 'Sidebar',
  figure: 'Figure',
  figcaption: 'Caption',
  blockquote: 'Quote',
  input: 'Field',
  textarea: 'Field',
  select: 'Dropdown',
  label: 'Label',
  table: 'Table',
  form: 'Form',
  video: 'Video',
  audio: 'Audio',
  span: 'Text',
  div: 'Block',
};

export function nounFor(tag) {
  return NOUNS[(tag || '').toLowerCase()] || 'Element';
}

/**
 * @param {{tag:string, snippet?:string}} anchor
 * @returns {string} e.g. `Heading — "Our Pricing"`
 */
export function labelFor(anchor) {
  const noun = nounFor(anchor.tag);
  const snippet = (anchor.snippet || '').trim();
  return snippet ? `${noun} — "${snippet}"` : noun;
}
