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
    return key.indexOf('-') === -1 ? key : key.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
  }
  function camelAttrs(attrs) {
    var out = {};
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) out[camel(k)] = attrs[k]; }
    return out;
  }

  window.Lc = function (props) {
    var size = props.size || 18;
    var node = window.lucide && window.lucide.icons && window.lucide.icons[pascal(props.n)];
    var svgStyle = Object.assign(
      { display: 'inline-flex', flex: 'none', verticalAlign: 'middle' },
      props.style || {}
    );
    // node = ["svg", svgAttrs, [ [tag, attrs], ... ] ]
    var children = node && node[2] ? node[2] : [];
    return React.createElement(
      'svg',
      {
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
        style: svgStyle,
      },
      children.map(function (c, i) {
        return React.createElement(c[0], Object.assign({ key: i }, camelAttrs(c[1] || {})));
      })
    );
  };

  // No-op: kept so existing callers don't break. We never use <i data-lucide>,
  // so there is nothing for lucide.createIcons() to upgrade.
  window.refreshIcons = function () {};
})();
