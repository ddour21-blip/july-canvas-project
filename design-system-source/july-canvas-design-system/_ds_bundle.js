/* @ds-bundle: {"format":3,"namespace":"JulyCanvasDesignSystem_d81917","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"AvatarStack","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"StatusBadge","sourcePath":"components/core/StatusBadge.jsx"},{"name":"LiveIndicator","sourcePath":"components/feedback/LiveIndicator.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"assets/cardkit.js":"dad8d8193b6a","components/core/Avatar.jsx":"78190488774e","components/core/Badge.jsx":"cecda416f8ff","components/core/Button.jsx":"baf640b8c339","components/core/Card.jsx":"27633985ca62","components/core/IconButton.jsx":"4f385416681e","components/core/StatusBadge.jsx":"4a962c85926f","components/feedback/LiveIndicator.jsx":"cdbe7108366e","components/feedback/Toast.jsx":"ae779802a6c1","components/forms/Input.jsx":"ffa1a4030d2a","components/forms/Textarea.jsx":"b6eae72098d9","components/navigation/Tabs.jsx":"e29b968afe17","ui_kits/workspace/App.jsx":"ab0395904400","ui_kits/workspace/Canvas.jsx":"eb3b5e298952","ui_kits/workspace/Chrome.jsx":"3b9ea9b6c085","ui_kits/workspace/Dashboard.jsx":"065b95681641","ui_kits/workspace/KakeAdmin.jsx":"b901ff2c7f91","ui_kits/workspace/ProjectDetail.jsx":"20472d67a0f7","ui_kits/workspace/ShareModal.jsx":"9a2cc8b0b698","ui_kits/workspace/data.js":"7452d7b11420"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.JulyCanvasDesignSystem_d81917 = window.JulyCanvasDesignSystem_d81917 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/cardkit.js
try { (() => {
/* July Canvas — specimen/kit helper kit.
   Provides a React-friendly Lucide icon wrapper. Load AFTER React and the
   Lucide UMD bundle.

   IMPORTANT: <Lc> renders a REAL React-owned <svg> built from Lucide's icon
   data — it does NOT emit an <i data-lucide> placeholder for lucide.createIcons()
   to swap out. Letting createIcons() replace React-managed nodes causes
   "removeChild" crashes when React later re-renders that subtree (e.g. on
   navigation). Rendering the SVG inside React keeps reconciliation safe. */
(function () {
  function pascal(name) {
    return String(name).split(/[-_]/).map(function (p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join('');
  }
  function camel(key) {
    return key.indexOf('-') === -1 ? key : key.replace(/-([a-z])/g, function (_, c) {
      return c.toUpperCase();
    });
  }
  function camelAttrs(attrs) {
    var out = {};
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) out[camel(k)] = attrs[k];
    }
    return out;
  }
  window.Lc = function (props) {
    var size = props.size || 18;
    var node = window.lucide && window.lucide.icons && window.lucide.icons[pascal(props.n)];
    var svgStyle = Object.assign({
      display: 'inline-flex',
      flex: 'none',
      verticalAlign: 'middle'
    }, props.style || {});
    // node = ["svg", svgAttrs, [ [tag, attrs], ... ] ]
    var children = node && node[2] ? node[2] : [];
    return React.createElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: props.sw || 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
      style: svgStyle
    }, children.map(function (c, i) {
      return React.createElement(c[0], Object.assign({
        key: i
      }, camelAttrs(c[1] || {})));
    }));
  };

  // No-op: kept so existing callers don't break. We never use <i data-lucide>,
  // so there is nothing for lucide.createIcons() to upgrade.
  window.refreshIcons = function () {};
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/cardkit.js", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * User avatar. Renders an image when `src` is given, otherwise the first
 * character of `name` on a brand-tinted circle.
 */
function Avatar({
  name = '',
  src,
  size = 'md',
  className = '',
  style,
  ...rest
}) {
  const classes = ['jc-avatar', size !== 'md' ? `jc-avatar--${size}` : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes,
    style: style,
    title: name
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : name.trim().charAt(0) || '?');
}

/**
 * Overlapping avatar stack with an optional "+N" overflow chip.
 * Pass `people` as an array of { name, src } and an optional `max`.
 */
function AvatarStack({
  people = [],
  max = 3,
  size = 'md'
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return /*#__PURE__*/React.createElement("span", {
    className: "jc-avatar-stack"
  }, shown.map((p, i) => /*#__PURE__*/React.createElement(Avatar, {
    key: i,
    name: p.name,
    src: p.src,
    size: size
  })), extra > 0 && /*#__PURE__*/React.createElement("span", {
    className: `jc-avatar jc-avatar--${size === 'md' ? 'sm' : size}`,
    style: {
      background: 'var(--gray-200)',
      color: 'var(--gray-600)'
    }
  }, "+", extra));
}
Object.assign(__ds_scope, { Avatar, AvatarStack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Status / category pill. `tone` maps to the design system's semantic
 * status colors. Optionally render a leading `icon` node.
 */
function Badge({
  children,
  tone = 'neutral',
  icon,
  className = '',
  ...rest
}) {
  const classes = ['jc-badge', `jc-badge--${tone}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * July Canvas primary action button.
 * Emits the shared `.jc-btn` classes from the design system stylesheet.
 *
 * Pass `icon` / `iconRight` as a rendered node (e.g. a Lucide element
 * `<Plus size={18} />`) — the component is icon-library agnostic.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  block = false,
  type = 'button',
  disabled = false,
  className = '',
  ...rest
}) {
  const classes = ['jc-btn', `jc-btn--${variant}`, size !== 'md' ? `jc-btn--${size}` : '', block ? 'jc-btn--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: classes,
    disabled: disabled
  }, rest), icon, children != null && /*#__PURE__*/React.createElement("span", null, children), iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Surface container. `padded` adds standard 24px padding; `interactive`
 * adds hover lift + brand border (for clickable project/screen cards);
 * `glass` applies the frosted glassmorphism treatment.
 */
function Card({
  children,
  padded = false,
  interactive = false,
  glass = false,
  as: Tag = 'div',
  className = '',
  ...rest
}) {
  const classes = ['jc-card', padded ? 'jc-card--pad' : '', interactive ? 'jc-card--interactive' : '', glass ? 'jc-card--glass' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: classes
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Square/round icon-only button. Pass a rendered icon node as `icon`
 * (or as children). Provide an accessible `aria-label`.
 */
function IconButton({
  icon,
  children,
  size = 'md',
  round = false,
  soft = false,
  danger = false,
  className = '',
  ...rest
}) {
  const classes = ['jc-icon-btn', size === 'sm' ? 'jc-icon-btn--sm' : '', round ? 'jc-icon-btn--round' : '', soft ? 'jc-icon-btn--soft' : '', danger ? 'jc-icon-btn--danger' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: classes
  }, rest), icon || children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Project lifecycle status → Korean label + tone (mirrors the product). */
const PROJECT_STATUS = {
  draft: {
    label: '초안',
    tone: 'neutral'
  },
  active: {
    label: '활성',
    tone: 'info'
  },
  review: {
    label: '리뷰',
    tone: 'warning'
  },
  approved: {
    label: '승인',
    tone: 'success'
  },
  handoff: {
    label: '전달됨',
    tone: 'archived'
  },
  archived: {
    label: '보관됨',
    tone: 'archived'
  }
};

/** Document status → label + tone. */
const DOC_STATUS = {
  draft: {
    label: '초안',
    tone: 'neutral'
  },
  review: {
    label: '리뷰',
    tone: 'warning'
  },
  approved: {
    label: '승인',
    tone: 'success'
  }
};

/**
 * Renders the correct label + color for a project or document status.
 * `kind="project"` (default) covers the 5-stage project lifecycle;
 * `kind="document"` covers the 3-stage doc pipeline.
 */
function StatusBadge({
  status,
  kind = 'project',
  ...rest
}) {
  const map = kind === 'document' ? DOC_STATUS : PROJECT_STATUS;
  const cfg = map[status] || {
    label: status,
    tone: 'neutral'
  };
  return /*#__PURE__*/React.createElement(__ds_scope.Badge, _extends({
    tone: cfg.tone
  }, rest), cfg.label);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/LiveIndicator.jsx
try { (() => {
/**
 * "실시간 동기화 중" live indicator: a pulsing green dot + label.
 * Used in the product header to show real-time sync is active.
 */
function LiveIndicator({
  label = '실시간 동기화 중',
  className = ''
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      font: 'var(--type-body-sm)',
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "jc-live-dot"
  }), label);
}
Object.assign(__ds_scope, { LiveIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/LiveIndicator.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/**
 * Transient toast pill. `type` controls the leading icon color.
 * Pass `icon` as a rendered node (success/error icon).
 */
function Toast({
  children,
  type = 'success',
  icon,
  className = ''
}) {
  const classes = ['jc-toast', `jc-toast--${type}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: classes,
    role: "status"
  }, icon, children);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text input with optional label, hint/error, and sunken variant.
 * Spread any native input attributes (placeholder, value, onChange…).
 */
function Input({
  label,
  hint,
  error,
  sunken = false,
  required = false,
  id,
  className = '',
  ...rest
}) {
  const inputId = id || (label ? `jc-in-${Math.random().toString(36).slice(2, 8)}` : undefined);
  const classes = ['jc-input', sunken ? 'jc-input--sunken' : '', error ? 'jc-input--invalid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: "jc-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "jc-field-label",
    htmlFor: inputId
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "jc-req"
  }, "*")), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    className: classes
  }, rest)), (error || hint) && /*#__PURE__*/React.createElement("p", {
    className: `jc-field-hint${error ? ' jc-field-hint--error' : ''}`
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Multi-line text input. Same label/hint/error API as `Input`. */
function Textarea({
  label,
  hint,
  error,
  sunken = false,
  required = false,
  id,
  className = '',
  ...rest
}) {
  const taId = id || (label ? `jc-ta-${Math.random().toString(36).slice(2, 8)}` : undefined);
  const classes = ['jc-textarea', sunken ? 'jc-textarea--sunken' : '', error ? 'jc-textarea--invalid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: "jc-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "jc-field-label",
    htmlFor: taId
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "jc-req"
  }, "*")), /*#__PURE__*/React.createElement("textarea", _extends({
    id: taId,
    className: classes
  }, rest)), (error || hint) && /*#__PURE__*/React.createElement("p", {
    className: `jc-field-hint${error ? ' jc-field-hint--error' : ''}`
  }, error || hint));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/**
 * Underline tab bar. `tabs` is an array of { key, label } (label may be a
 * node). Controlled via `value` + `onChange(key)`.
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `jc-tabs ${className}`.trim(),
    role: "tablist"
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.key,
    role: "tab",
    "aria-selected": value === t.key,
    className: `jc-tab${value === t.key ? ' jc-tab--active' : ''}`,
    onClick: () => onChange?.(t.key)
  }, t.label)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/App.jsx
try { (() => {
/* July Canvas UI kit — root app, shell layout & view router.
   Structure: [ Sidebar | ( Topbar / Content ) ] + Share modal overlay. */
function App() {
  const [view, setView] = React.useState({
    name: 'dashboard'
  });
  const [shareOpen, setShareOpen] = React.useState(false);

  // Upgrade Lucide <i data-lucide> placeholders to <svg> after every render.
  React.useEffect(() => {
    window.refreshIcons();
  });
  const goHome = () => setView({
    name: 'dashboard'
  });
  const openProject = p => setView({
    name: 'project',
    project: p
  });
  const isCanvas = view.name === 'canvas';
  let breadcrumb = [{
    label: '프로젝트'
  }];
  if (view.name === 'project') breadcrumb = [{
    label: '프로젝트',
    onClick: goHome
  }, {
    label: view.project.name
  }];
  if (isCanvas) breadcrumb = [{
    label: '프로젝트',
    onClick: goHome
  }, {
    label: view.project.name,
    onClick: () => openProject(view.project)
  }, {
    label: view.screen.name
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    current: "projects",
    onHome: goHome,
    onOpenProject: openProject
  }), /*#__PURE__*/React.createElement("div", {
    className: "jc-app-bg",
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    breadcrumb: breadcrumb,
    onShare: () => setShareOpen(true)
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: isCanvas ? 'hidden' : 'auto'
    }
  }, view.name === 'dashboard' && /*#__PURE__*/React.createElement(Dashboard, {
    onOpenProject: openProject,
    onShare: () => setShareOpen(true)
  }), view.name === 'project' && /*#__PURE__*/React.createElement(ProjectDetail, {
    project: view.project,
    onBack: goHome,
    onOpenScreen: s => setView({
      name: 'canvas',
      project: view.project,
      screen: s
    }),
    onShare: () => setShareOpen(true)
  }), isCanvas && /*#__PURE__*/React.createElement(Canvas, {
    project: view.project,
    screen: view.screen,
    onBack: () => openProject(view.project),
    onShare: () => setShareOpen(true)
  }))), /*#__PURE__*/React.createElement(ShareModal, {
    open: shareOpen,
    onClose: () => setShareOpen(false)
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
window.refreshIcons();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/Canvas.jsx
try { (() => {
/* July Canvas UI kit — the prototype Canvas / Screen editor.
   Toggling the bottom toolbar switches between 프로토타입 (interact) and
   기획/문서 모드 (annotate): the latter reveals the policy panel, the green
   click-to-define banner, and a numbered marker on the embedded screen. */
const {
  Button: JCBtn,
  Badge: JCBd
} = window.JulyCanvasDesignSystem_d81917;
function PolicyPanel({
  onClose
}) {
  const ann = window.JCData.annotation;
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 'var(--panel-width)',
      flex: 'none',
      background: 'var(--surface-card)',
      borderLeft: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-2xl)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 'var(--z-panel)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '800 20px/1.2 var(--font-sans)',
      color: 'var(--text-strong)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "file-text",
    size: 20,
    style: {
      color: 'var(--brand-600)'
    }
  }), " \uAE30\uB2A5 \uC815\uCC45 / \uAE30\uD68D\uC11C", /*#__PURE__*/React.createElement("span", {
    style: {
      font: '300 18px/1 var(--font-sans)',
      color: 'var(--gray-300)'
    }
  }, "| Policy")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-meta)',
      color: 'var(--text-secondary)',
      marginTop: 6
    }
  }, "\uD654\uBA74\uC5D0 \uC815\uC758\uB41C \uBAA8\uB4E0 UI \uC815\uCC45\uACFC \uC2A4\uD399")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "jc-icon-btn jc-icon-btn--round jc-icon-btn--soft",
    "aria-label": "\uB2EB\uAE30"
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 24,
      background: 'var(--gray-25)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      border: '2px solid var(--brand-500)',
      borderRadius: 'var(--radius-lg)',
      background: '#fff',
      padding: 20,
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -14,
      top: 18,
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-primary)',
      color: 'var(--color-on-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '800 14px/1 var(--font-sans)',
      border: '2px solid #fff',
      boxShadow: 'var(--shadow-md)'
    }
  }, ann.number), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginLeft: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "jc-tag"
  }, "v", ann.version), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '800 15px/1.2 var(--font-sans)',
      color: 'var(--text-strong)'
    }
  }, ann.title)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, ann.body.map(b => /*#__PURE__*/React.createElement("div", {
    key: b,
    style: {
      font: '600 13px/1.4 var(--font-sans)',
      color: 'var(--text-secondary)'
    }
  }, b)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      paddingLeft: 16,
      borderLeft: '2px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      font: '700 12px/1 var(--font-sans)',
      color: 'var(--text-tertiary)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "message-circle",
    size: 14
  }), " \uB313\uAE00 \uBC0F \uB17C\uC758 ", ann.comments.length), ann.comments.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "jc-card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "jc-avatar jc-avatar--sm"
  }, c.author.charAt(0)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13px/1 var(--font-sans)',
      color: 'var(--text-strong)'
    }
  }, c.author)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 10px/1 var(--font-sans)',
      color: 'var(--text-tertiary)'
    }
  }, c.time)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '500 13px/1.5 var(--font-sans)',
      color: 'var(--text-body)',
      marginLeft: 36
    }
  }, c.text))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "jc-input",
    placeholder: "\uC774 \uC815\uCC45\uC5D0 \uB300\uD55C \uC0C8\uB85C\uC6B4 \uB313\uAE00\uC744 \uB0A8\uACA8\uC8FC\uC138\uC694.",
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "jc-btn jc-btn--primary",
    style: {
      width: 40,
      padding: 0
    },
    "aria-label": "\uC804\uC1A1"
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "send",
    size: 16
  }))))));
}
function Canvas({
  screen,
  project,
  onBack,
  onShare
}) {
  const [mode, setMode] = React.useState('interact'); // interact | document
  const isDoc = mode === 'document';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 'calc(100vh - var(--header-height))',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--gray-100)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden'
    }
  }, isDoc && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 30,
      textAlign: 'center',
      padding: '9px',
      background: 'var(--color-primary)',
      color: 'var(--color-on-primary)',
      font: '700 13px/1 var(--font-sans)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)'
    }
  }, "\uD83D\uDC46 \uAE30\uB2A5\uC744 \uC815\uC758\uD560 UI \uC694\uC18C\uB97C \uB9C8\uC6B0\uC2A4\uB85C \uD074\uB9AD\uD558\uC138\uC694"), /*#__PURE__*/React.createElement("div", {
    className: "jc-glass",
    style: {
      position: 'absolute',
      top: 16,
      left: 24,
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '8px 14px',
      borderRadius: 'var(--radius-lg)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "jc-icon-btn jc-icon-btn--sm",
    "aria-label": "\uB4A4\uB85C"
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "arrow-left",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 10px/1.3 var(--font-sans)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, project.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 14px/1.2 var(--font-sans)',
      color: 'var(--text-strong)'
    }
  }, screen.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 16,
      right: 24,
      zIndex: 20,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(JCBtn, {
    variant: "glass",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "download"
    }),
    style: {
      color: 'var(--brand-700)'
    }
  }, "\uBB38\uC11C \uB2E4\uC6B4\uB85C\uB4DC"), /*#__PURE__*/React.createElement(JCBtn, {
    variant: "glass",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "external-link"
    }),
    onClick: onShare
  }, "\uACF5\uC720 \uBC0F \uCD08\uB300")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'auto',
      padding: '88px 40px 120px',
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      maxWidth: 1180,
      alignSelf: 'flex-start',
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-2xl)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(KakeAdmin, null), isDoc && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 150,
      top: 360,
      zIndex: 10,
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-primary)',
      color: 'var(--color-on-primary)',
      border: '2px solid #fff',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '800 14px/1 var(--font-sans)'
    }
  }, "1"))), /*#__PURE__*/React.createElement(BottomToolbar, {
    mode: isDoc ? 'document' : 'prototype',
    onToggleMode: () => setMode(isDoc ? 'interact' : 'document')
  })), isDoc && /*#__PURE__*/React.createElement(PolicyPanel, {
    onClose: () => setMode('interact')
  }));
}
Object.assign(window, {
  Canvas
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/Canvas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/Chrome.jsx
try { (() => {
/* July Canvas UI kit — workspace shell: Logo, Sidebar, Topbar, BottomToolbar.
   Structured layout: left nav (org → projects) · top actions · content · right panel. */
const {
  IconButton: JCIconButton,
  Badge: JCBadge,
  AvatarStack: JCAvatarStack,
  LiveIndicator: JCLive,
  Avatar: JCAvatar
} = window.JulyCanvasDesignSystem_d81917;
const STATUS_DOT = {
  active: 'var(--brand-500)',
  review: 'var(--amber-500)',
  approved: 'var(--green-500)',
  draft: 'var(--gray-300)',
  archived: 'var(--slate-500)'
};
const ROLE_LABEL = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer'
};
function Logo({
  size = 30,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      cursor: onClick ? 'pointer' : 'default',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.svg",
    width: size,
    height: size,
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 17px/1 var(--font-sans)',
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap'
    }
  }, "July ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-primary-text)'
    }
  }, "\uCE94\uBC84\uC2A4")));
}

/* ---- Left navigation: organization → projects --------------------- */
function Sidebar({
  current,
  onHome,
  onOpenProject
}) {
  const org = window.JCData.org;
  const me = window.JCData.members[0];
  const recents = window.JCData.projects.slice(0, 4);
  const nav = [{
    key: 'projects',
    label: '프로젝트',
    icon: 'folder-kanban',
    active: current !== 'mywork' && current !== 'favorites' && current !== 'members'
  }, {
    key: 'mywork',
    label: '내 업무',
    icon: 'square-check-big'
  }, {
    key: 'favorites',
    label: '즐겨찾기',
    icon: 'star'
  }, {
    key: 'members',
    label: '팀원',
    icon: 'users'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 'var(--sidebar-width)',
      flex: 'none',
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: 'var(--surface-card)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      textAlign: 'left',
      padding: '10px 10px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--gray-25)',
      cursor: 'pointer',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gradient-brand)',
      color: 'var(--color-on-primary)',
      font: '800 14px/1 var(--font-sans)',
      boxShadow: 'var(--shadow-brand)'
    }
  }, "JC"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '800 14px/1.2 var(--font-sans)',
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, org.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '500 11px/1.3 var(--font-sans)',
      color: 'var(--text-tertiary)'
    }
  }, org.plan)), /*#__PURE__*/React.createElement(Lc, {
    n: "chevrons-up-down",
    size: 16,
    style: {
      color: 'var(--text-tertiary)',
      flex: 'none'
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, nav.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.key,
    onClick: it.key === 'projects' ? onHome : undefined,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '9px 12px',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      width: '100%',
      background: it.active ? 'var(--surface-active)' : 'transparent',
      color: it.active ? 'var(--brand-700)' : 'var(--text-secondary)',
      font: `${it.active ? 700 : 600} 13.5px/1 var(--font-sans)`
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: it.icon,
    size: 17,
    style: {
      color: it.active ? 'var(--brand-600)' : 'var(--text-tertiary)',
      flex: 'none'
    }
  }), " ", it.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 10.5px/1 var(--font-sans)',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, "\uCD5C\uADFC \uD504\uB85C\uC81D\uD2B8"), /*#__PURE__*/React.createElement(Lc, {
    n: "plus",
    size: 14,
    style: {
      color: 'var(--text-tertiary)',
      cursor: 'pointer'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      overflowY: 'auto'
    }
  }, recents.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => onOpenProject(p),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '8px 12px',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      width: '100%',
      background: 'transparent',
      color: 'var(--text-body)',
      font: '600 13px/1.2 var(--font-sans)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--surface-hover)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: STATUS_DOT[p.status] || 'var(--gray-300)',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, p.name))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 14,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '8px 8px',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "jc-avatar jc-avatar--sm"
  }, me.name.charAt(0)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '700 13px/1.2 var(--font-sans)',
      color: 'var(--text-strong)'
    }
  }, me.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '500 11px/1.3 var(--font-sans)',
      color: 'var(--text-tertiary)'
    }
  }, ROLE_LABEL[me.role], " \xB7 ", me.email)), /*#__PURE__*/React.createElement(Lc, {
    n: "settings",
    size: 16,
    style: {
      color: 'var(--text-tertiary)',
      flex: 'none'
    }
  }))));
}

/* ---- Notifications dropdown --------------------------------------- */
function NotifMenu({
  onClose
}) {
  const items = window.JCData.notifications;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 90
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'calc(100% + 10px)',
      right: 0,
      width: 340,
      zIndex: 100,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-xl)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 14px/1 var(--font-sans)',
      color: 'var(--text-strong)'
    }
  }, "\uC54C\uB9BC"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12px/1 var(--font-sans)',
      color: 'var(--color-primary-text)',
      cursor: 'pointer'
    }
  }, "\uBAA8\uB450 \uC77D\uC74C")), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 320,
      overflowY: 'auto'
    }
  }, items.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 11,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border-subtle)',
      background: n.unread ? 'var(--brand-25)' : '#fff'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "jc-avatar jc-avatar--sm",
    style: {
      background: 'var(--brand-100)'
    }
  }, n.who.charAt(0)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 12.5px/1.45 var(--font-sans)',
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-strong)'
    }
  }, n.who), " \xB7 ", n.text), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 11px/1 var(--font-sans)',
      color: 'var(--text-tertiary)',
      marginTop: 5
    }
  }, n.when)), n.unread && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: 'var(--brand-500)',
      flex: 'none',
      marginTop: 5
    }
  }))))));
}

/* ---- Topbar: breadcrumb · search · actions ------------------------ */
function Topbar({
  breadcrumb = [],
  onShare
}) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const unread = window.JCData.notifications.filter(n => n.unread).length;
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-sticky)',
      height: 'var(--header-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px 0 24px',
      gap: 16,
      background: 'var(--glass-fill-strong)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      borderBottom: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      font: '600 13.5px/1 var(--font-sans)'
    }
  }, breadcrumb.map((b, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement(Lc, {
    n: "chevron-right",
    size: 15,
    style: {
      color: 'var(--gray-300)',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: b.onClick,
    disabled: !b.onClick,
    style: {
      background: 'none',
      border: 'none',
      cursor: b.onClick ? 'pointer' : 'default',
      padding: 0,
      font: 'inherit',
      color: i === breadcrumb.length - 1 ? 'var(--text-strong)' : 'var(--text-secondary)',
      fontWeight: i === breadcrumb.length - 1 ? 800 : 600,
      whiteSpace: 'nowrap'
    }
  }, b.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 36,
      padding: '0 12px',
      width: 220,
      background: 'var(--gray-50)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-pill)'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "search",
    size: 15,
    style: {
      color: 'var(--text-tertiary)',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "\uD504\uB85C\uC81D\uD2B8 \xB7 \uBB38\uC11C \uAC80\uC0C9",
    style: {
      border: 'none',
      background: 'none',
      outline: 'none',
      width: '100%',
      font: '500 13px/1 var(--font-sans)',
      color: 'var(--text-body)'
    }
  })), /*#__PURE__*/React.createElement(JCLive, null), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 22,
      background: 'var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setNotifOpen(v => !v),
    className: "jc-icon-btn",
    style: {
      position: 'relative'
    },
    "aria-label": "\uC54C\uB9BC"
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "bell",
    size: 18
  }), unread > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 15,
      height: 15,
      padding: '0 3px',
      background: 'var(--red-500)',
      color: '#fff',
      borderRadius: 999,
      font: '700 9px/15px var(--font-sans)',
      textAlign: 'center'
    }
  }, unread)), notifOpen && /*#__PURE__*/React.createElement(NotifMenu, {
    onClose: () => setNotifOpen(false)
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onShare,
    className: "jc-btn jc-btn--primary jc-btn--sm",
    style: {
      paddingLeft: 12,
      paddingRight: 14
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "user-plus",
    size: 15
  }), " \uACF5\uC720"), /*#__PURE__*/React.createElement(JCAvatarStack, {
    people: window.JCData.members,
    max: 3,
    size: "sm"
  })));
}

/* ---- Floating canvas toolbar -------------------------------------- */
function BottomToolbar({
  mode,
  onToggleMode
}) {
  const isDoc = mode === 'document';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      bottom: 24,
      transform: 'translateX(-50%)',
      zIndex: 'var(--z-toolbar)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '8px 10px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--glass-fill-strong)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      boxShadow: 'var(--shadow-xl)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      padding: '0 6px',
      color: 'var(--gray-300)',
      cursor: 'grab'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "grip-vertical",
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      borderRadius: 999,
      background: 'var(--green-50)',
      color: 'var(--green-700)',
      font: '700 13px/1 var(--font-sans)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "jc-live-dot"
  }), " \uC2E4\uC2DC\uAC04 \uACF5\uC720 \uCF1C\uC9D0"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 22,
      background: 'var(--border-default)',
      margin: '0 6px'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      borderRadius: 999,
      background: 'var(--brand-50)',
      color: 'var(--brand-700)',
      border: 'none',
      cursor: 'pointer',
      font: '700 13px/1 var(--font-sans)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "history",
    size: 16
  }), " \uC804\uCCB4 \uD788\uC2A4\uD1A0\uB9AC"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 22,
      background: 'var(--border-default)',
      margin: '0 6px'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13px/1 var(--font-sans)',
      color: isDoc ? 'var(--text-tertiary)' : 'var(--text-strong)',
      padding: '0 4px',
      whiteSpace: 'nowrap'
    }
  }, "\uD504\uB85C\uD1A0\uD0C0\uC785"), /*#__PURE__*/React.createElement("button", {
    onClick: onToggleMode,
    "aria-label": "\uBAA8\uB4DC \uC804\uD658",
    style: {
      width: 46,
      height: 26,
      borderRadius: 999,
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      background: isDoc ? 'var(--brand-500)' : 'var(--gray-300)',
      transition: 'background var(--dur-normal) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: isDoc ? 23 : 3,
      width: 20,
      height: 20,
      borderRadius: 999,
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left var(--dur-normal) var(--ease-standard)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13px/1 var(--font-sans)',
      color: isDoc ? 'var(--text-strong)' : 'var(--text-tertiary)',
      padding: '0 4px',
      whiteSpace: 'nowrap'
    }
  }, "\uAE30\uD68D/\uBB38\uC11C \uBAA8\uB4DC"));
}
Object.assign(window, {
  Logo,
  Sidebar,
  Topbar,
  BottomToolbar,
  STATUS_DOT,
  ROLE_LABEL
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/Chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/Dashboard.jsx
try { (() => {
/* July Canvas UI kit — Dashboard / organization home (내 프로젝트). */
const {
  Button: JCButton,
  StatusBadge: JCStatusBadge,
  AvatarStack: JCDashStack
} = window.JulyCanvasDesignSystem_d81917;
function ProjectCard({
  project,
  onOpen
}) {
  const people = window.JCData.members.slice(0, project.members);
  return /*#__PURE__*/React.createElement("div", {
    className: "jc-card jc-card--interactive jc-card--pad",
    onClick: () => onOpen(project),
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-lg)',
      display: 'inline-flex',
      flex: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--brand-50)',
      color: 'var(--brand-600)'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "folder-kanban",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '700 16px/1.3 var(--font-sans)',
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, project.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(JCStatusBadge, {
    status: project.status
  })))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-secondary)',
      minHeight: 36
    }
  }, project.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      font: '600 11.5px/1 var(--font-sans)',
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "layout-template",
    size: 13
  }), " \uD654\uBA74 ", project.screens), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "file-text",
    size: 13
  }), " \uBB38\uC11C ", project.docs)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 13,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(JCDashStack, {
    people: people,
    max: 3,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      font: '600 11.5px/1 var(--font-sans)',
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "clock",
    size: 13
  }), " ", project.updated)));
}
function ActivityRail() {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "jc-card jc-card--pad"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '700 14px/1 var(--font-sans)',
      color: 'var(--text-strong)',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "activity",
    size: 16,
    style: {
      color: 'var(--color-primary-text)'
    }
  }), " \uCD5C\uADFC \uD65C\uB3D9"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, window.JCData.activity.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-md)',
      flex: 'none',
      background: 'var(--gray-50)',
      color: 'var(--text-secondary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: a.icon,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 12.5px/1.45 var(--font-sans)',
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-strong)'
    }
  }, a.who), "\uB2D8\uC774 ", a.what), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 11px/1 var(--font-sans)',
      color: 'var(--text-tertiary)',
      marginTop: 5
    }
  }, a.when)))))));
}
function Dashboard({
  onOpenProject,
  onShare
}) {
  const projects = window.JCData.projects;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--layout-max)',
      margin: '0 auto',
      padding: '32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      marginBottom: 28,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: '800 28px/1.15 var(--font-sans)',
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)'
    }
  }, "\uB0B4 \uD504\uB85C\uC81D\uD2B8"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-secondary)',
      marginTop: 8
    }
  }, "\uAE30\uD68D \uBB38\uC11C\uC640 \uD504\uB85C\uD1A0\uD0C0\uC785\uC744 \uAD00\uB9AC\uD560 \uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD558\uAC70\uB098 \uC811\uC18D \uCF54\uB4DC\uB85C \uC785\uC7A5\uD558\uC138\uC694.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("form", {
    className: "jc-card",
    onSubmit: e => e.preventDefault(),
    style: {
      display: 'flex',
      alignItems: 'center',
      height: 40,
      overflow: 'hidden',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "jc-input",
    placeholder: "\uC811\uC18D \uCF54\uB4DC (\uC608: project_123)",
    style: {
      border: 'none',
      width: 190,
      height: '100%',
      boxShadow: 'none'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      height: '100%',
      padding: '0 16px',
      border: 'none',
      borderLeft: '1px solid var(--border-default)',
      whiteSpace: 'nowrap',
      background: 'var(--gray-50)',
      font: '700 13px/1 var(--font-sans)',
      color: 'var(--gray-600)',
      cursor: 'pointer'
    }
  }, "\uBC14\uB85C \uC785\uC7A5")), /*#__PURE__*/React.createElement(JCButton, {
    variant: "secondary",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "database"
    })
  }, "\uB370\uC774\uD130 \uBC31\uC5C5/\uBCF5\uC6D0"), /*#__PURE__*/React.createElement(JCButton, {
    variant: "secondary",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "users"
    }),
    onClick: onShare
  }, "\uD300\uC6D0 \uAD00\uB9AC (", window.JCData.members.length, ")"), /*#__PURE__*/React.createElement(JCButton, {
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "plus"
    })
  }, "\uC0C8 \uD504\uB85C\uC81D\uD2B8"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 320px',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))',
      gap: 18
    }
  }, projects.map(p => /*#__PURE__*/React.createElement(ProjectCard, {
    key: p.id,
    project: p,
    onOpen: onOpenProject
  }))), /*#__PURE__*/React.createElement(ActivityRail, null)));
}
Object.assign(window, {
  Dashboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/KakeAdmin.jsx
try { (() => {
/* July Canvas UI kit — the embedded "KAKE ADMIN" prototype screen,
   rendered inside the canvas (recreation of the 365 클래스 맵 view). */
function KakeAdmin() {
  const rows = window.JCData.classRows;
  const tierStyle = t => t === 'PREMIUM' ? {
    background: 'var(--tier-prem-bg)',
    color: 'var(--tier-prem-fg)'
  } : {
    background: 'var(--tier-free-bg)',
    color: 'var(--tier-free-fg)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: 560,
      background: '#fff',
      font: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 248,
      background: 'var(--ink)',
      color: 'var(--text-on-ink)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '900 20px/1 var(--font-sans)',
      letterSpacing: '-0.01em',
      marginBottom: 4
    }
  }, "KAKE", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--brand-400)'
    }
  }, "ADMIN")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 11px/1.4 var(--font-sans)',
      color: 'var(--text-on-ink-dim)',
      marginBottom: 28
    }
  }, "\uD1B5\uD569 \uAD00\uB9AC\uC790 \uC2A4\uD29C\uB514\uC624"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 10px/1 var(--font-sans)',
      letterSpacing: '0.06em',
      color: 'var(--text-on-ink-dim)',
      marginBottom: 12
    }
  }, "\uCF58\uD150\uCE20 \uAD00\uB9AC"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 14px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-primary)',
      color: 'var(--color-on-primary)',
      font: '700 13px/1 var(--font-sans)',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "list-checks",
    size: 16
  }), " 365 \uD074\uB798\uC2A4 \uB9F5"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 14px',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-on-ink-dim)',
      font: '600 13px/1 var(--font-sans)',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "flag",
    size: 16
  }), " \uC2A4\uD14C\uC774\uC9C0 (\uD5C8\uB4E4) \uAD00\uB9AC"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 10px/1 var(--font-sans)',
      letterSpacing: '0.06em',
      color: 'var(--text-on-ink-dim)',
      marginBottom: 12
    }
  }, "\uC0AC\uC6A9\uC790 \uBC0F \uC6B4\uC601"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 14px',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-on-ink-dim)',
      font: '600 13px/1 var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "users",
    size: 16
  }), " \uC218\uAC15\uC0DD \uAD00\uB9AC"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '11px',
      background: 'var(--ink-soft)',
      color: 'var(--text-on-ink)',
      border: '1px solid var(--glass-border-ink)',
      borderRadius: 'var(--radius-md)',
      font: '600 13px/1 var(--font-sans)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "lock",
    size: 15
  }), " \uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD"), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '11px',
      background: 'var(--ink-soft)',
      color: 'var(--text-on-ink)',
      border: '1px solid var(--glass-border-ink)',
      borderRadius: 'var(--radius-md)',
      font: '600 13px/1 var(--font-sans)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "log-out",
    size: 15
  }), " \uB85C\uADF8\uC544\uC6C3"))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: 36
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '800 26px/1.15 var(--font-sans)',
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)'
    }
  }, "365 \uD074\uB798\uC2A4 \uB9F5"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-secondary)',
      marginTop: 6
    }
  }, "Day 1\uBD80\uD130 Day 365\uAE4C\uC9C0 \uCEE4\uB9AC\uD058\uB7FC \uD604\uD669\uC744 \uB9E4\uD551\uD558\uACE0 \uAD00\uB9AC\uD569\uB2C8\uB2E4.")), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '11px 18px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-primary)',
      color: 'var(--color-on-primary)',
      border: 'none',
      cursor: 'pointer',
      font: '700 13px/1 var(--font-sans)',
      boxShadow: 'var(--shadow-brand)'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "plus",
    size: 16
  }), " \uD074\uB798\uC2A4 \uCD94\uAC00")), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBottom: '1px solid var(--border-default)'
    }
  }, ['Day', '클래스 주제', '장르', '수업 수', '멤버십 설정', '상태', '설정'].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      textAlign: i > 2 && i < 6 ? 'center' : 'left',
      padding: '12px 8px',
      font: '700 12px/1 var(--font-sans)',
      color: 'var(--text-secondary)'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.day,
    style: {
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '16px 8px',
      font: '800 13px/1 var(--font-sans)',
      color: 'var(--color-primary-text)'
    }
  }, r.day), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '16px 8px',
      font: '600 13px/1.3 var(--font-sans)',
      color: 'var(--text-strong)'
    }
  }, r.topic), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '16px 8px',
      font: '500 12px/1 var(--font-sans)',
      color: 'var(--text-secondary)'
    }
  }, r.genre), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '16px 8px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'var(--gray-100)',
      color: 'var(--gray-600)',
      padding: '3px 10px',
      borderRadius: 999,
      font: '700 11px/1 var(--font-sans)'
    }
  }, r.lessons)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '16px 8px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...tierStyle(r.tier),
      padding: '4px 10px',
      borderRadius: 'var(--radius-sm)',
      font: '700 10px/1 var(--font-sans)'
    }
  }, r.tier)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '16px 8px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: r.visible ? 'var(--brand-50)' : 'var(--gray-100)',
      color: r.visible ? 'var(--brand-700)' : 'var(--gray-500)',
      padding: '4px 12px',
      borderRadius: 'var(--radius-sm)',
      font: '700 11px/1 var(--font-sans)'
    }
  }, r.visible ? '노출' : '비노출')), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '16px 8px',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      border: '1px solid var(--border-default)',
      padding: '5px 10px',
      borderRadius: 'var(--radius-sm)',
      font: '600 11px/1 var(--font-sans)',
      color: 'var(--gray-600)'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "pencil",
    size: 12
  }), " \uC218\uC815"))))))));
}
Object.assign(window, {
  KakeAdmin
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/KakeAdmin.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/ProjectDetail.jsx
try { (() => {
/* July Canvas UI kit — Project detail (개요 / 문서 / 프로토타입). */
const {
  Button: JCB,
  StatusBadge: JCSB,
  Tabs: JCTabs,
  Badge: JCBg
} = window.JulyCanvasDesignSystem_d81917;
function ActivationSummary({
  a
}) {
  const rows = [['기획 의도', a.intent], ['해결하려는 문제', a.problem], ['핵심 고객', a.customer], ['핵심 가치', a.value], ['핵심 차별점', a.differentiator], ['MVP 범위', a.mvpScope]];
  return /*#__PURE__*/React.createElement("div", {
    className: "jc-card jc-card--pad"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-strong)',
      marginBottom: 16
    }
  }, "\uD65C\uC131\uD654 \uC815\uBCF4"), /*#__PURE__*/React.createElement("dl", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      margin: 0
    }
  }, rows.map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'grid',
      gridTemplateColumns: '110px 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      font: '700 11px/1.5 var(--font-sans)',
      color: 'var(--text-tertiary)'
    }
  }, k), /*#__PURE__*/React.createElement("dd", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-body)',
      margin: 0
    }
  }, v)))));
}
function Overview({
  project,
  onTab
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(ActivationSummary, {
    a: project.activation || window.JCData.projects[0].activation
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "jc-card jc-card--pad"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-strong)',
      marginBottom: 4
    }
  }, "\uCD5C\uC885 \uC0B0\uCD9C\uBB3C"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-secondary)',
      marginBottom: 18
    }
  }, "\uCF54\uC6CC\uD06C \uB2F4\uB2F9\uC790\uC5D0\uAC8C \uC804\uB2EC\uD560 PRD\uC640 \uD504\uB85C\uD1A0\uD0C0\uC785 URL\uC785\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(JCB, {
    variant: "outline",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "file-text"
    }),
    style: {
      justifyContent: 'flex-start'
    },
    onClick: () => onTab('documents')
  }, "PRD \uBB38\uC11C \uAD00\uB9AC\uB85C \uC774\uB3D9"), /*#__PURE__*/React.createElement(JCB, {
    variant: "outline",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "link-2"
    }),
    style: {
      justifyContent: 'flex-start'
    }
  }, "\uD504\uB85C\uD1A0\uD0C0\uC785 URL \uBCF5\uC0AC"))), /*#__PURE__*/React.createElement("div", {
    className: "jc-card jc-card--pad",
    style: {
      background: 'var(--gradient-brand-soft)',
      borderColor: 'var(--brand-200)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-lg)',
      background: 'var(--color-primary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-on-primary)',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "sparkles",
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    style: {
      font: '700 15px/1.3 var(--font-sans)',
      color: 'var(--text-strong)'
    }
  }, "\uB2E4\uC74C \uB2E8\uACC4: \uC81C\uD488\uD654\uC804\uB7B5 \uAC80\uC218"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-secondary)',
      marginTop: 4
    }
  }, "\uC81C\uD488\uD654\uC804\uB7B5 \uBB38\uC11C\uAC00 \uB9AC\uBDF0 \uC0C1\uD0DC\uC785\uB2C8\uB2E4. \uC2B9\uC778\uD558\uBA74 IA\xB7\uAE30\uB2A5\uC815\uC758\uC11C \uC791\uC131\uC73C\uB85C \uB118\uC5B4\uAC11\uB2C8\uB2E4."))))));
}
function Deliverables() {
  const KIND = {
    MD: {
      c: 'var(--brand-600)',
      b: 'var(--brand-50)'
    },
    PPTX: {
      c: 'var(--amber-600)',
      b: 'var(--amber-50)'
    },
    PDF: {
      c: 'var(--red-600)',
      b: 'var(--red-50)'
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "jc-card jc-card--pad",
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-strong)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "package",
    size: 18,
    style: {
      color: 'var(--color-primary-text)'
    }
  }), " \uC0B0\uCD9C\uBB3C"), /*#__PURE__*/React.createElement(JCB, {
    variant: "outline",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "download",
      size: 14
    })
  }, "\uC804\uCCB4 ZIP")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: 12
    }
  }, window.JCData.deliverables.map(d => {
    const k = KIND[d.kind] || KIND.MD;
    return /*#__PURE__*/React.createElement("div", {
      key: d.file,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 14px',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--gray-25)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 'var(--radius-md)',
        flex: 'none',
        background: k.b,
        color: k.c,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: '800 10px/1 var(--font-sans)'
      }
    }, d.kind), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '700 13px/1.2 var(--font-sans)',
        color: 'var(--text-strong)'
      }
    }, d.title), /*#__PURE__*/React.createElement("div", {
      style: {
        font: '500 11px/1.3 var(--font-mono)',
        color: 'var(--text-tertiary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, d.file, " \xB7 ", d.size)), /*#__PURE__*/React.createElement("button", {
      className: "jc-icon-btn jc-icon-btn--sm",
      "aria-label": "\uB2E4\uC6B4\uB85C\uB4DC"
    }, /*#__PURE__*/React.createElement(Lc, {
      n: "download",
      size: 15
    })));
  })));
}
function DocPipeline() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "jc-card jc-card--pad",
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-strong)'
    }
  }, "\uBB38\uC11C \uD30C\uC774\uD504\uB77C\uC778"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-secondary)',
      marginTop: 4
    }
  }, "\uBE0C\uB9AC\uD504 \u2192 \uC2DC\uC7A5\uC870\uC0AC \u2192 \uC81C\uD488\uD654\uC804\uB7B5 \u2192 IA \u2192 \uAE30\uB2A5\uC815\uC758\uC11C \u2192 PRD \uC21C\uC73C\uB85C \uC791\uC131\uD569\uB2C8\uB2E4.")), /*#__PURE__*/React.createElement(JCBg, {
    tone: "warning"
  }, "\uBBF8\uC791\uC131 1\uAC74")), window.JCData.documents.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.type,
    className: "jc-card",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '16px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-md)',
      background: 'var(--brand-50)',
      color: 'var(--brand-600)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '700 14px/1 var(--font-sans)'
    }
  }, d.order), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 14px/1.2 var(--font-sans)',
      color: 'var(--text-strong)'
    }
  }, d.title), /*#__PURE__*/React.createElement("span", {
    className: "jc-tag jc-tag--neutral"
  }, "v", d.version), d.locked && /*#__PURE__*/React.createElement(Lc, {
    n: "lock",
    size: 12,
    style: {
      color: 'var(--text-tertiary)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 11px/1.4 var(--font-mono)',
      color: 'var(--text-tertiary)'
    }
  }, d.file))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(JCSB, {
    status: d.status,
    kind: "document"
  }), /*#__PURE__*/React.createElement(JCB, {
    variant: "outline",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "download",
      size: 14
    })
  }, "MD"))))), /*#__PURE__*/React.createElement(Deliverables, null));
}
function ScreensGrid({
  onOpenScreen
}) {
  const screens = window.JCData.screens;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(JCB, {
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "plus"
    })
  }, "\uC0C8 \uD654\uBA74 \uCD94\uAC00")), screens.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '64px 24px',
      textAlign: 'center',
      border: '2px dashed var(--border-strong)',
      borderRadius: 'var(--radius-2xl)',
      background: 'var(--gray-25)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 'var(--radius-xl)',
      background: 'var(--gray-100)',
      color: 'var(--text-tertiary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "layout-template",
    size: 30
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '800 18px/1.2 var(--font-sans)',
      color: 'var(--text-strong)',
      marginBottom: 8
    }
  }, "\uB4F1\uB85D\uB41C \uD654\uBA74\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-secondary)'
    }
  }, "'\uC0C8 \uD654\uBA74 \uCD94\uAC00' \uBC84\uD2BC\uC744 \uB20C\uB7EC \uCCAB \uBC88\uC9F8 \uD504\uB85C\uD1A0\uD0C0\uC785\uC744 \uB4F1\uB85D\uD574\uBCF4\uC138\uC694.")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      gap: 22
    }
  }, screens.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "jc-card jc-card--interactive",
    onClick: () => onOpenScreen(s),
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 132,
      background: 'var(--gray-50)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--gray-300)'
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "file-code-2",
    size: 44
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: '700 16px/1.2 var(--font-sans)',
      color: 'var(--text-strong)',
      marginBottom: 10
    }
  }, s.name), /*#__PURE__*/React.createElement("span", {
    className: "jc-badge jc-badge--neutral"
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "message-square-plus",
    size: 12
  }), " \uAE30\uD68D/\uC815\uCC45: ", s.annotations, "\uAC1C"))))));
}
function ProjectDetail({
  project,
  onBack,
  onOpenScreen,
  onShare
}) {
  const [tab, setTab] = React.useState('overview');
  const tabs = [{
    key: 'overview',
    label: '개요'
  }, {
    key: 'documents',
    label: `문서 (${window.JCData.documents.length})`
  }, {
    key: 'screens',
    label: `프로토타입 (${window.JCData.screens.length})`
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--layout-max)',
      margin: '0 auto',
      padding: '32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 24,
      marginBottom: 22,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: '800 30px/1.1 var(--font-sans)',
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)'
    }
  }, project.name), /*#__PURE__*/React.createElement(JCSB, {
    status: project.status
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-secondary)',
      marginTop: 8
    }
  }, project.desc)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(JCB, {
    variant: "outline",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "external-link"
    }),
    onClick: onShare
  }, "\uACF5\uC720 \uBC0F \uCD08\uB300"), /*#__PURE__*/React.createElement(JCB, {
    variant: "danger",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "trash-2"
    })
  }, "\uC0AD\uC81C"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 26
    }
  }, /*#__PURE__*/React.createElement(JCTabs, {
    tabs: tabs,
    value: tab,
    onChange: setTab
  })), tab === 'overview' && /*#__PURE__*/React.createElement(Overview, {
    project: project,
    onTab: setTab
  }), tab === 'documents' && /*#__PURE__*/React.createElement(DocPipeline, null), tab === 'screens' && /*#__PURE__*/React.createElement(ScreensGrid, {
    onOpenScreen: onOpenScreen
  }));
}
Object.assign(window, {
  ProjectDetail
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/ProjectDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/ShareModal.jsx
try { (() => {
/* July Canvas UI kit — Share & members modal (공유 및 초대 / 권한). */
const {
  Button: JCShareBtn,
  Badge: JCShareBadge
} = window.JulyCanvasDesignSystem_d81917;
const SHARE_ROLE = {
  owner: {
    label: '소유자',
    tone: 'brand'
  },
  editor: {
    label: '편집 가능',
    tone: 'success'
  },
  viewer: {
    label: '보기 전용',
    tone: 'neutral'
  }
};
function ShareModal({
  open,
  onClose
}) {
  if (!open) return null;
  const members = window.JCData.members;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 'var(--z-modal)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'rgba(20, 26, 34, 0.45)',
      backdropFilter: 'blur(3px)',
      WebkitBackdropFilter: 'blur(3px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: 520,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-2xl)',
      boxShadow: 'var(--shadow-2xl)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: '24px 24px 0'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: '800 20px/1.2 var(--font-sans)',
      color: 'var(--text-strong)',
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "user-plus",
    size: 20,
    style: {
      color: 'var(--brand-600)'
    }
  }), " \uACF5\uC720 \uBC0F \uCD08\uB300"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-secondary)',
      marginTop: 6
    }
  }, "\uC774\uBA54\uC77C\uB85C \uD300\uC6D0\uC744 \uCD08\uB300\uD558\uACE0 \uD504\uB85C\uC81D\uD2B8 \uAD8C\uD55C\uC744 \uC124\uC815\uD558\uC138\uC694.")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "jc-icon-btn jc-icon-btn--round jc-icon-btn--soft",
    "aria-label": "\uB2EB\uAE30"
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: '20px 24px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "jc-input",
    placeholder: "\uC774\uBA54\uC77C \uC8FC\uC18C \uC785\uB825 (\uC608: name@team.io)",
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("select", {
    className: "jc-input",
    style: {
      width: 130,
      flex: 'none',
      cursor: 'pointer'
    },
    defaultValue: "editor"
  }, /*#__PURE__*/React.createElement("option", {
    value: "editor"
  }, "\uD3B8\uC9D1 \uAC00\uB2A5"), /*#__PURE__*/React.createElement("option", {
    value: "viewer"
  }, "\uBCF4\uAE30 \uC804\uC6A9")), /*#__PURE__*/React.createElement(JCShareBtn, {
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "send",
      size: 15
    })
  }, "\uCD08\uB300")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 24px',
      maxHeight: 280,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 11px/1 var(--font-sans)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)',
      marginBottom: 10
    }
  }, "\uCC38\uC5EC \uBA64\uBC84 ", members.length, "\uBA85"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, members.map(m => {
    const r = SHARE_ROLE[m.role];
    return /*#__PURE__*/React.createElement("div", {
      key: m.email,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 8px',
        borderRadius: 'var(--radius-md)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "jc-avatar jc-avatar--sm"
    }, m.name.charAt(0)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '700 13.5px/1.2 var(--font-sans)',
        color: 'var(--text-strong)'
      }
    }, m.name), /*#__PURE__*/React.createElement("div", {
      style: {
        font: '500 11.5px/1.3 var(--font-sans)',
        color: 'var(--text-tertiary)'
      }
    }, m.email)), m.role === 'owner' ? /*#__PURE__*/React.createElement(JCShareBadge, {
      tone: "brand"
    }, "\uC18C\uC720\uC790") : /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        font: '600 12px/1 var(--font-sans)',
        color: 'var(--text-body)',
        cursor: 'pointer'
      }
    }, r.label, " ", /*#__PURE__*/React.createElement(Lc, {
      n: "chevron-down",
      size: 14,
      style: {
        color: 'var(--text-tertiary)'
      }
    })));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      margin: '20px 24px 24px',
      padding: '14px 16px',
      background: 'var(--gray-50)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Lc, {
    n: "link-2",
    size: 16,
    style: {
      color: 'var(--brand-600)',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12.5px/1.3 var(--font-mono)',
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "july.canvas/p/kake_8f2a")), /*#__PURE__*/React.createElement(JCShareBtn, {
    variant: "outline",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Lc, {
      n: "copy",
      size: 14
    })
  }, "\uB9C1\uD06C \uBCF5\uC0AC"))));
}
Object.assign(window, {
  ShareModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/ShareModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/data.js
try { (() => {
/* July Canvas UI kit — sample data (fake, for the interactive recreation). */
window.JCData = function () {
  const members = [{
    name: '김유나',
    email: 'yuna@julycanvas.io',
    role: 'owner'
  }, {
    name: '이준호',
    email: 'junho@julycanvas.io',
    role: 'editor'
  }, {
    name: '박지민',
    email: 'jimin@julycanvas.io',
    role: 'editor'
  }, {
    name: '최서연',
    email: 'seoyeon@julycanvas.io',
    role: 'viewer'
  }];
  const org = {
    name: 'July Canvas',
    plan: '조직 워크스페이스',
    code: 'jc-team'
  };
  const projects = [{
    id: 'kake',
    name: 'kake',
    status: 'active',
    desc: 'kake 서비스 관리자 콘솔의 프로토타입입니다.',
    screens: 5,
    docs: 6,
    members: 4,
    updated: '방금 전',
    activation: {
      intent: '강사와 수강생을 잇는 365일 커리큘럼 운영 콘솔을 만든다.',
      problem: '클래스·스테이지·멤버십이 흩어져 있어 운영자가 현황을 한눈에 못 본다.',
      customer: '온라인 클래스 운영자 / 콘텐츠 관리자',
      value: 'Day 1~365 커리큘럼을 한 화면에서 매핑·관리',
      differentiator: '기획 정책과 프로토타입이 같은 캔버스에서 연결됨',
      revenue: 'FREE(TRIAL) → PREMIUM 구독 전환',
      market: '국내 온라인 클래스 플랫폼',
      mvpScope: '365 클래스 맵 · 스테이지 관리 · 수강생 관리',
      laterScope: '결제·정산 대시보드, 멤버십 자동화',
      references: 'kake.com, 클래스101'
    }
  }, {
    id: 'shop',
    name: '쇼핑몰 앱 리뉴얼',
    status: 'review',
    desc: '커머스 앱 메인·검색·결제 흐름 재설계.',
    screens: 3,
    docs: 4,
    members: 3,
    updated: '2시간 전'
  }, {
    id: 'fin',
    name: '핀테크 온보딩',
    status: 'approved',
    desc: '신규 가입 KYC 및 계좌개설 온보딩.',
    screens: 8,
    docs: 6,
    members: 5,
    updated: '어제'
  }, {
    id: 'edu',
    name: '에듀테크 LMS',
    status: 'draft',
    desc: '아직 활성화되지 않은 프로젝트입니다.',
    screens: 0,
    docs: 0,
    members: 2,
    updated: '3일 전'
  }, {
    id: 'hr',
    name: '사내 HR 포털',
    status: 'archived',
    desc: '구성원 온보딩/근태 관리 포털 (보관됨).',
    screens: 6,
    docs: 5,
    members: 4,
    updated: '2주 전'
  }];
  const documents = [{
    type: 'brief',
    title: '프로젝트 브리프',
    file: 'PROJECT_BRIEF.md',
    order: 1,
    status: 'approved',
    version: '1.2'
  }, {
    type: 'market_research',
    title: '시장조사',
    file: 'MARKET_RESEARCH.md',
    order: 2,
    status: 'approved',
    version: '1.1'
  }, {
    type: 'product_strategy',
    title: '제품화전략',
    file: 'PRODUCT_STRATEGY.md',
    order: 3,
    status: 'review',
    version: '1.0'
  }, {
    type: 'ia',
    title: 'IA (정보구조)',
    file: 'IA.md',
    order: 4,
    status: 'review',
    version: '1.0'
  }, {
    type: 'feature_spec',
    title: '기능정의서',
    file: 'FEATURE_SPEC.md',
    order: 5,
    status: 'draft',
    version: '0.3'
  }, {
    type: 'prd',
    title: 'PRD',
    file: 'PRD.md',
    order: 6,
    status: 'draft',
    version: '0.1',
    locked: false
  }];

  // Deliverables (산출물) — downloadable outputs
  const deliverables = [{
    title: 'PRD',
    file: 'PRD.md',
    kind: 'MD',
    status: 'draft',
    size: '24 KB'
  }, {
    title: '기능정의서',
    file: 'FEATURE_SPEC.pptx',
    kind: 'PPTX',
    status: 'draft',
    size: '1.8 MB'
  }, {
    title: '제품화전략',
    file: 'PRODUCT_STRATEGY.pdf',
    kind: 'PDF',
    status: 'review',
    size: '420 KB'
  }, {
    title: '시장조사',
    file: 'MARKET_RESEARCH.md',
    kind: 'MD',
    status: 'approved',
    size: '18 KB'
  }];
  const activity = [{
    who: '이준호',
    what: '제품화전략 문서를 리뷰 요청했습니다.',
    when: '10분 전',
    icon: 'file-text'
  }, {
    who: '박지민',
    what: '365 클래스 맵 정책에 댓글을 남겼습니다.',
    when: '32분 전',
    icon: 'message-circle'
  }, {
    who: '김유나',
    what: '시장조사 문서를 승인했습니다.',
    when: '1시간 전',
    icon: 'check-circle-2'
  }, {
    who: '최서연',
    what: '쇼핑몰 앱 리뉴얼 프로젝트에 참여했습니다.',
    when: '어제',
    icon: 'user-plus'
  }];
  const notifications = [{
    who: '박지민',
    text: '@김유나 멤버십 배지 색상 정책 확인 부탁드려요.',
    when: '오전 10:45',
    unread: true
  }, {
    who: '이준호',
    text: '제품화전략 v1.0 리뷰가 요청되었습니다.',
    when: '오전 9:30',
    unread: true
  }, {
    who: '시스템',
    text: 'PRD.md 자동 생성이 완료되었습니다.',
    when: '어제',
    unread: false
  }];

  // KAKE admin "365 클래스 맵" demo rows (the embedded prototype)
  const classRows = [{
    day: 'D-1',
    topic: '오리엔테이션: 나의 목표 설정하기',
    genre: '공통',
    lessons: '5개',
    tier: 'FREE (TRIAL)',
    visible: true
  }, {
    day: 'D-2',
    topic: '호흡의 기초: 복식호흡 이해하기',
    genre: 'VOCAL',
    lessons: '0개',
    tier: 'FREE (TRIAL)',
    visible: true
  }, {
    day: 'D-3',
    topic: '리듬 트레이닝: 바운스 기초',
    genre: 'DANCE',
    lessons: '0개',
    tier: 'FREE (TRIAL)',
    visible: true
  }, {
    day: 'D-4',
    topic: '스케일 연습 1: 5톤 스케일',
    genre: 'VOCAL',
    lessons: '0개',
    tier: 'PREMIUM',
    visible: true
  }, {
    day: 'D-5',
    topic: '스텝 베이직: 투스텝 & 크로스',
    genre: 'DANCE',
    lessons: '0개',
    tier: 'PREMIUM',
    visible: false
  }];
  const screens = [{
    id: 's-map',
    name: '365 클래스 맵',
    annotations: 1
  }, {
    id: 's-login',
    name: '관리자 로그인',
    annotations: 0
  }, {
    id: 's-stage',
    name: '스테이지 (허들) 관리',
    annotations: 0
  }, {
    id: 's-users',
    name: '수강생 관리',
    annotations: 0
  }, {
    id: 's-main',
    name: '메인',
    annotations: 0
  }];
  const annotation = {
    number: 1,
    version: '1.0',
    title: '콘텐츠 관리 영역',
    body: ['[기능 정의]', '[동작]', '[정책]', '[예외 사항]'],
    comments: [{
      author: '김유나',
      time: '오전 10:45',
      text: '멤버십 상태가 PREMIUM일 때 배지 색상을 더 강조하면 좋을 것 같아요.'
    }, {
      author: '이준호',
      time: '오전 10:48',
      text: '좋은 의견입니다! 그린 톤을 조금 더 진하게 변경하겠습니다.'
    }]
  };
  return {
    members,
    org,
    projects,
    documents,
    deliverables,
    activity,
    notifications,
    classRows,
    screens,
    annotation
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.AvatarStack = __ds_scope.AvatarStack;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.LiveIndicator = __ds_scope.LiveIndicator;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
