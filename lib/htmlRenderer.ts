// iframe srcDoc 용 HTML 보일러플레이트 생성
// React 코드(JSX)는 Babel standalone + esm.sh importmap 으로 런타임 트랜스파일,
// 순수 HTML은 그대로 래핑합니다. (iframe 내부에서 독립 실행)

export const generateHtmlBoilerplate = (rawCode: string): string => {
  if (!rawCode) return '';
  const trimmed = rawCode.trim().toLowerCase();
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) return rawCode;

  const isReact =
    rawCode.includes('import React') ||
    rawCode.includes("from 'react'") ||
    rawCode.includes('from "react"') ||
    rawCode.includes('export default');

  if (isReact) {
    const safeCode = rawCode
      .replace(/export\s+default\s+function\s+([a-zA-Z0-9_]+)/g, 'const __AppComp = function $1')
      .replace(/export\s+default\s+function\s*\(/g, 'const __AppComp = function(')
      .replace(/export\s+default\s+([a-zA-Z0-9_]+);?/g, 'const __AppComp = $1;')
      .split('<' + '/script>')
      .join('<\\/script>');

    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Pretendard', sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        </style>
        <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@18.2.0",
              "react/jsx-runtime": "https://esm.sh/react@18.2.0/jsx-runtime",
              "react/jsx-dev-runtime": "https://esm.sh/react@18.2.0/jsx-dev-runtime",
              "react-dom": "https://esm.sh/react-dom@18.2.0",
              "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
              "lucide-react": "https://esm.sh/lucide-react@0.292.0?deps=react@18.2.0",
              "recharts": "https://esm.sh/recharts@2.10.3?deps=react@18.2.0,react-dom@18.2.0"
            }
          }
        </script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/plain" id="user-code">${safeCode}</script>
        <script>
          function renderApp() {
            const codeRaw = document.getElementById('user-code').textContent;
            try {
              const transformed = Babel.transform(codeRaw, { presets: ['react'] }).code;
              const script = document.createElement('script');
              script.type = 'module';
              script.textContent = transformed + '\\n\\n' +
                'import { createRoot as __createRoot } from "react-dom/client";\\n' +
                'import * as __React from "react";\\n' +
                'setTimeout(() => {\\n' +
                '  const rootEl = document.getElementById("root");\\n' +
                '  let Comp = typeof __AppComp !== "undefined" ? __AppComp : (typeof App !== "undefined" ? App : (typeof Main !== "undefined" ? Main : null));\\n' +
                '  if (Comp) {\\n' +
                '    __createRoot(rootEl).render(__React.createElement(Comp));\\n' +
                '  } else {\\n' +
                '    rootEl.innerHTML = \\'<div style="padding: 20px; color: #991b1b; background: #fee2e2; border: 1px solid #f87171; border-radius: 8px; margin: 20px;"><b>렌더링 에러:</b><br/>App 컴포넌트를 찾을 수 없습니다. (export default 구문 포함 여부를 확인해주세요)</div>\\';\\n' +
                '  }\\n' +
                '}, 100);';
              document.body.appendChild(script);
            } catch (err) {
              const safeErr = err.message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
              document.getElementById('root').innerHTML = '<div style="padding: 20px; color: #991b1b; background: #fee2e2; border: 1px solid #f87171; border-radius: 8px; margin: 20px;"><b>컴파일 에러:</b><br/>' + safeErr + '</div>';
              console.error(err);
            }
          }
          const checkBabel = setInterval(() => {
            if (typeof Babel !== 'undefined') {
              clearInterval(checkBabel);
              renderApp();
            }
          }, 50);
        </script>
      </body>
      </html>
    `;
  }

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>body { font-family: 'Pretendard', sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }</style></head><body>${rawCode}</body></html>`;
};
