import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: true,
    padding: 30
  }
});

export default function Mermaid({ chart }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then((result) => {
          if (ref.current) {
            ref.current.innerHTML = result.svg;
          }
        })
        .catch(console.error);
    }
  }, [chart]);

  return <div ref={ref} className="mermaid-container" />;
}
