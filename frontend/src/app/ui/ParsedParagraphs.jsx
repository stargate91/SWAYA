import { useMemo } from 'react';

/**
 * A component that splits text by double line breaks (\n{2,}) and renders them as paragraphs.
 *
 * @param {Object} props
 * @param {string} props.text - The text content to split and render.
 * @param {string} [props.className] - CSS class name for the wrapper div (optional, if wrapped).
 * @param {string} [props.paragraphClassName] - CSS class name for each paragraph element.
 * @returns {React.ReactElement|null}
 */
export default function ParsedParagraphs({
  text,
  className = '',
  paragraphClassName = '',
}) {
  const paragraphs = useMemo(() => {
    if (!text || typeof text !== 'string') return [];
    return text.split(/\n{2,}/).filter((p) => p.trim() !== '');
  }, [text]);

  if (paragraphs.length === 0) return null;

  const content = paragraphs.map((paragraph, index) => (
    <p
      key={index}
      className={paragraphClassName || undefined}
    >
      {paragraph}
    </p>
  ));

  if (className) {
    return <div className={className}>{content}</div>;
  }

  return <>{content}</>;
}
