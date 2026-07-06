/* @ds-bundle: {"namespace":"NixItDS","components":[{"name":"Avatar","sourcePath":"components/core/Avatar/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card/Card.jsx"},{"name":"CohortTimer","sourcePath":"components/nix/CohortTimer/CohortTimer.jsx"},{"name":"Input","sourcePath":"components/forms/Input/Input.jsx"},{"name":"Logo","sourcePath":"components/core/Logo/Logo.jsx"},{"name":"NixDateCard","sourcePath":"components/nix/NixDateCard/NixDateCard.jsx"},{"name":"SideNav","sourcePath":"components/navigation/SideNav/SideNav.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast/Toast.jsx"}],"sourceHashes":{"components/core/Avatar/Avatar.jsx":"9f2fe5aaa090","components/core/Avatar/Avatar.d.ts":"935a039208d6","components/core/Avatar/Avatar.prompt.md":"db8115d59cf1","components/core/Badge/Badge.jsx":"39b5aed4f6ec","components/core/Badge/Badge.d.ts":"7bda35dbc702","components/core/Badge/Badge.prompt.md":"cf438c9982c4","components/core/Button/Button.jsx":"43e036be860f","components/core/Button/Button.d.ts":"58693d7e5b5c","components/core/Button/Button.prompt.md":"74af0989ce73","components/core/Card/Card.jsx":"4b44777f591a","components/core/Card/Card.d.ts":"3a7f0950f4d8","components/core/Card/Card.prompt.md":"34b3a15d873e","components/nix/CohortTimer/CohortTimer.jsx":"1392fef62a7e","components/nix/CohortTimer/CohortTimer.d.ts":"c5729416d84c","components/nix/CohortTimer/CohortTimer.prompt.md":"43fd52ac97af","components/forms/Input/Input.jsx":"8b87e5cd0c56","components/forms/Input/Input.d.ts":"722b30a0ad16","components/forms/Input/Input.prompt.md":"ac5fd87c9f8d","components/core/Logo/Logo.jsx":"77dde6f8b099","components/core/Logo/Logo.d.ts":"de8b340297f2","components/core/Logo/Logo.prompt.md":"3a14f364dc16","components/nix/NixDateCard/NixDateCard.jsx":"7da01d1be8bf","components/nix/NixDateCard/NixDateCard.d.ts":"7cf8f0174ca7","components/nix/NixDateCard/NixDateCard.prompt.md":"3d8b6ed7c335","components/navigation/SideNav/SideNav.jsx":"8dc6bc6562cc","components/navigation/SideNav/SideNav.d.ts":"b76030379661","components/navigation/SideNav/SideNav.prompt.md":"860fcb70ca7a","components/feedback/Toast/Toast.jsx":"864494eb9384","components/feedback/Toast/Toast.d.ts":"9c01ebc2e3db","components/feedback/Toast/Toast.prompt.md":"2e94dad86338"},"inlinedExternals":[],"builtBy":"cc-design-sync"} */
"use strict";
var NixItDS = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function np(p, k) {
        var o = {};
        for (var x in p) if (x !== "children") o[x] = p[x];
        if (k !== void 0) o.key = k;
        return o;
      }
      function jsx11(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs9(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx11;
      module.exports.jsxs = jsxs9;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs9 : jsx11)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    Avatar: () => Avatar,
    Badge: () => Badge,
    Button: () => Button,
    Card: () => Card,
    CohortTimer: () => CohortTimer,
    Input: () => Input,
    Logo: () => Logo,
    NixDateCard: () => NixDateCard,
    SideNav: () => SideNav,
    Toast: () => Toast
  });
  init_define_import_meta_env();

  // src/components/ui/Avatar.tsx
  init_define_import_meta_env();
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var SIZE_PX = { xs: 24, sm: 32, md: 40, lg: 48, xl: 56, "2xl": 80 };
  var BG_COLORS = [
    "var(--lavender-400)",
    "var(--purple-400)",
    "var(--lavender-300)",
    "var(--purple-500)",
    "var(--lavender-500)"
  ];
  var STATUS_COLORS = {
    online: "var(--lavender-500)",
    away: "var(--neutral-400)",
    busy: "var(--purple-500)",
    offline: "var(--neutral-300)"
  };
  function Avatar({ src, name, size = "md", status, style }) {
    const px = SIZE_PX[size] ?? SIZE_PX.md;
    const initials = name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
    const bg = name ? BG_COLORS[name.charCodeAt(0) % BG_COLORS.length] : BG_COLORS[0];
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "relative", display: "inline-flex", flexShrink: 0, ...style }, children: [
      src ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "img",
        {
          src,
          alt: name,
          style: { width: px, height: px, borderRadius: "var(--radius-full)", objectFit: "cover", display: "block" }
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
        width: px,
        height: px,
        borderRadius: "var(--radius-full)",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontWeight: "var(--weight-bold)",
        color: "white",
        fontSize: Math.round(px * 0.38),
        userSelect: "none"
      }, children: initials }),
      status && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
        position: "absolute",
        bottom: px > 36 ? 2 : 1,
        right: px > 36 ? 2 : 1,
        width: Math.max(8, Math.round(px * 0.26)),
        height: Math.max(8, Math.round(px * 0.26)),
        borderRadius: "var(--radius-full)",
        background: STATUS_COLORS[status] ?? STATUS_COLORS.offline,
        border: "2px solid white",
        display: "block"
      } })
    ] });
  }

  // src/components/ui/Badge.tsx
  init_define_import_meta_env();
  var import_jsx_runtime2 = __toESM(require_react_shim(), 1);
  var VARIANTS = {
    lavender: { bg: "var(--lavender-100)", color: "var(--lavender-600)" },
    purple: { bg: "var(--purple-100)", color: "var(--purple-600)" },
    neutral: { bg: "var(--neutral-100)", color: "var(--neutral-600)" },
    frosted: { bg: "rgba(255,255,255,0.80)", color: "var(--lavender-500)", border: "1px solid rgba(150,126,255,0.22)" },
    success: { bg: "var(--lavender-100)", color: "var(--lavender-600)" },
    warning: { bg: "var(--neutral-100)", color: "var(--neutral-600)" },
    danger: { bg: "var(--purple-100)", color: "var(--purple-600)" }
  };
  var SIZES = {
    sm: { fontSize: "var(--text-xs)", padding: "2px 8px", dotPx: 5 },
    md: { fontSize: "var(--text-xs)", padding: "4px 10px", dotPx: 6 },
    lg: { fontSize: "var(--text-sm)", padding: "5px 13px", dotPx: 7 }
  };
  function Badge({ children, variant = "lavender", size = "md", dot, style, ...props }) {
    const v = VARIANTS[variant] ?? VARIANTS.lavender;
    const s = SIZES[size] ?? SIZES.md;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      background: v.bg,
      color: v.color,
      borderRadius: "var(--radius-xs)",
      border: v.border ?? "none",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-wide)",
      fontSize: s.fontSize,
      padding: s.padding,
      lineHeight: 1.4,
      ...style
    }, ...props, children: [
      dot && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: {
        width: s.dotPx,
        height: s.dotPx,
        borderRadius: "var(--radius-full)",
        background: v.color,
        flexShrink: 0,
        display: "inline-block"
      } }),
      children
    ] });
  }

  // src/components/ui/Button.tsx
  init_define_import_meta_env();
  var import_jsx_runtime3 = __toESM(require_react_shim(), 1);
  var glass = (color, border) => ({
    background: "rgba(255,255,255,0.86)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    color,
    border: `1.5px solid ${border}`,
    boxShadow: "0 2px 12px rgba(122,98,245,0.10)"
  });
  var VARIANTS2 = {
    primary: glass("var(--lavender-600)", "rgba(150,126,255,0.32)"),
    secondary: { ...glass("var(--color-text-secondary)", "rgba(0,0,0,0.09)"), boxShadow: "var(--shadow-xs)" },
    ghost: { background: "transparent", color: "var(--lavender-500)", border: "none", boxShadow: "none", backdropFilter: "none", WebkitBackdropFilter: "none" },
    danger: glass("var(--purple-600)", "rgba(61,31,138,0.22)"),
    outline: { background: "transparent", color: "var(--lavender-600)", border: "1.5px solid var(--lavender-300)", boxShadow: "none" },
    purple: glass("var(--purple-600)", "rgba(61,31,138,0.28)")
  };
  var SIZES2 = {
    sm: { fontSize: "var(--text-sm)", padding: "var(--padding-btn-sm)" },
    md: { fontSize: "var(--text-base)", padding: "var(--padding-btn-md)" },
    lg: { fontSize: "var(--text-md)", padding: "var(--padding-btn-lg)" }
  };
  function Button({ children, variant = "primary", size = "md", disabled, onClick, icon, style, ...props }) {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "var(--tracking-wide)",
      borderRadius: "var(--radius-md)",
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "all var(--transition-base)",
      whiteSpace: "nowrap",
      lineHeight: 1
    };
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "button",
      {
        disabled,
        onClick,
        style: { ...base, ...SIZES2[size], ...VARIANTS2[variant], ...style },
        ...props,
        children: [
          icon && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { fontSize: "1.1em", lineHeight: 1, display: "flex" }, children: icon }),
          children
        ]
      }
    );
  }

  // src/components/ui/Card.tsx
  init_define_import_meta_env();
  var import_jsx_runtime4 = __toESM(require_react_shim(), 1);
  var VARIANTS3 = {
    default: { background: "#fff", boxShadow: "var(--shadow-sm)", border: "1px solid var(--color-border-subtle)" },
    elevated: { background: "#fff", boxShadow: "var(--shadow-md)", border: "none" },
    flat: { background: "var(--neutral-50)", boxShadow: "none", border: "1px solid var(--color-border)" },
    lavender: { background: "var(--lavender-50)", boxShadow: "none", border: "1px solid var(--lavender-200)" },
    purple: { background: "var(--purple-50)", boxShadow: "none", border: "1px solid var(--purple-100)" },
    glass: {
      background: "rgba(255,255,255,0.72)",
      boxShadow: "var(--shadow-md)",
      border: "1px solid rgba(255,255,255,0.85)",
      backdropFilter: "var(--blur-md)",
      WebkitBackdropFilter: "var(--blur-md)"
    }
  };
  var PADDINGS = {
    none: "0",
    sm: "var(--padding-card-sm)",
    md: "var(--padding-card-md)",
    lg: "var(--padding-card-lg)"
  };
  function Card({ children, variant = "default", padding = "md", style, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: {
      borderRadius: "var(--radius-xl)",
      padding: PADDINGS[padding] ?? PADDINGS.md,
      ...VARIANTS3[variant],
      ...style
    }, ...props, children });
  }

  // src/components/ui/Input.tsx
  init_define_import_meta_env();
  var import_react = __toESM(require_react_shim(), 1);
  var import_jsx_runtime5 = __toESM(require_react_shim(), 1);
  function Input({ label, error, hint, prefix, suffix, type = "text", disabled, style, inputStyle, ...props }) {
    const [focused, setFocused] = (0, import_react.useState)(false);
    const borderColor = error ? "var(--color-danger)" : focused ? "var(--color-border-focus)" : "var(--color-border)";
    const ring = error ? "rgba(61,31,138,0.14)" : focused ? "rgba(150,126,255,0.18)" : "transparent";
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: "var(--space-2)", ...style }, children: [
      label && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { style: {
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-semibold)",
        color: error ? "var(--color-danger)" : "var(--color-text)",
        letterSpacing: "var(--tracking-wide)"
      }, children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: {
        display: "flex",
        alignItems: "center",
        border: `1.5px solid ${borderColor}`,
        borderRadius: "var(--radius-md)",
        background: disabled ? "var(--neutral-50)" : "white",
        boxShadow: `0 0 0 3px ${ring}`,
        transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
        overflow: "hidden",
        opacity: disabled ? 0.65 : 1
      }, children: [
        prefix && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { padding: "0 8px 0 14px", color: "var(--color-text-muted)", fontFamily: "var(--font-body)", fontSize: "var(--text-base)", flexShrink: 0 }, children: prefix }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "input",
          {
            type,
            disabled,
            onFocus: () => setFocused(true),
            onBlur: () => setFocused(false),
            style: {
              flex: 1,
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-base)",
              color: "var(--color-text)",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "var(--padding-input)",
              paddingLeft: prefix ? "4px" : void 0,
              paddingRight: suffix ? "4px" : void 0,
              width: "100%",
              ...inputStyle
            },
            ...props
          }
        ),
        suffix && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { padding: "0 14px 0 8px", color: "var(--color-text-muted)", fontFamily: "var(--font-body)", fontSize: "var(--text-base)", flexShrink: 0 }, children: suffix })
      ] }),
      (hint || error) && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: {
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-xs)",
        color: error ? "var(--color-danger)" : "var(--color-text-muted)",
        lineHeight: "var(--leading-snug)"
      }, children: error || hint })
    ] });
  }

  // src/components/ui/Logo.tsx
  init_define_import_meta_env();
  var import_jsx_runtime6 = __toESM(require_react_shim(), 1);
  var LOGO_FILTER = "hue-rotate(-35deg) saturate(0.85)";
  var CROPS = {
    full: { x: 0.11, y: 0.25, w: 0.81, h: 0.49 },
    mark: { x: 0.12, y: 0.37, w: 0.27, h: 0.35 }
  };
  function Logo({ height = 32, variant = "full", style }) {
    const crop = CROPS[variant];
    const imgSize = height / crop.h;
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "div",
      {
        role: "img",
        "aria-label": "NixIt",
        style: {
          height,
          width: height * (crop.w / crop.h),
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
          ...style
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "img",
          {
            src: "/assets/logo.png",
            alt: "",
            style: {
              position: "absolute",
              width: imgSize,
              height: imgSize,
              maxWidth: "none",
              left: -crop.x * imgSize,
              top: -crop.y * imgSize,
              filter: LOGO_FILTER,
              mixBlendMode: "multiply"
            }
          }
        )
      }
    );
  }

  // src/components/ui/Toast.tsx
  init_define_import_meta_env();
  var import_jsx_runtime7 = __toESM(require_react_shim(), 1);
  var TYPES = {
    default: { bg: "rgba(255,255,255,0.90)", border: "rgba(150,126,255,0.22)", iconBg: "var(--lavender-400)", icon: "\u2726", blur: true },
    success: { bg: "var(--lavender-50)", border: "var(--lavender-200)", iconBg: "var(--lavender-500)", icon: "\u2713" },
    warning: { bg: "var(--neutral-50)", border: "var(--neutral-200)", iconBg: "var(--neutral-500)", icon: "!" },
    error: { bg: "var(--purple-50)", border: "var(--purple-100)", iconBg: "var(--purple-600)", icon: "\u2715" }
  };
  function Toast({ message, type = "default", visible = true, onClose, action, style }) {
    if (!visible) return null;
    const t = TYPES[type] ?? TYPES.default;
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: "var(--radius-lg)",
      padding: "13px 16px",
      boxShadow: "var(--shadow-lg)",
      maxWidth: 380,
      backdropFilter: t.blur ? "blur(16px)" : "none",
      WebkitBackdropFilter: t.blur ? "blur(16px)" : "none",
      ...style
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: {
        width: 26,
        height: 26,
        borderRadius: "var(--radius-full)",
        background: t.iconBg,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: "var(--weight-bold)",
        fontFamily: "var(--font-body)",
        flexShrink: 0
      }, children: t.icon }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: {
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-sm)",
        color: "var(--color-text)",
        flex: 1,
        lineHeight: "var(--leading-snug)"
      }, children: message }),
      action && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { onClick: action.onClick, style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-semibold)",
        color: "var(--lavender-600)",
        flexShrink: 0,
        padding: "4px 6px"
      }, children: action.label }),
      onClose && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { onClick: onClose, style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--color-text-muted)",
        fontSize: "18px",
        lineHeight: 1,
        padding: "2px 4px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center"
      }, children: "\xD7" })
    ] });
  }

  // src/components/navigation/SideNav.tsx
  init_define_import_meta_env();
  var import_jsx_runtime8 = __toESM(require_react_shim(), 1);
  function SideNav({ items, activeId, onNavigate, collapsed = false, onToggle, logo, userAvatar, userName, onUserClick, userActive, onSignOut, style }) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("nav", { style: {
      display: "flex",
      flexDirection: "column",
      width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)",
      minHeight: "100vh",
      background: "white",
      borderRight: "1px solid var(--color-border-subtle)",
      padding: `20px ${collapsed ? "12px" : "14px"}`,
      gap: "2px",
      transition: "width var(--transition-base)",
      overflow: "hidden",
      flexShrink: 0,
      ...style
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: {
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        marginBottom: "var(--space-5)",
        paddingBottom: "var(--space-4)",
        borderBottom: "1px solid var(--color-border-subtle)",
        minHeight: 40,
        gap: 8
      }, children: [
        logo && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { overflow: "hidden", flexShrink: collapsed ? 0 : 1 }, children: logo }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { onClick: onToggle, "aria-label": collapsed ? "Expand menu" : "Collapse menu", style: {
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          padding: "5px",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "18px",
          transition: "color var(--transition-fast)"
        }, children: collapsed ? "\u203A" : "\u2039" })
      ] }),
      items.map((item) => {
        const active = activeId === item.id;
        return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { onClick: () => onNavigate?.(item.id), style: {
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : "var(--space-3)",
          padding: collapsed ? "11px 0" : "10px 12px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: "var(--radius-lg)",
          border: "none",
          cursor: "pointer",
          background: active ? "var(--lavender-50)" : "transparent",
          color: active ? "var(--lavender-600)" : "var(--color-text-secondary)",
          fontFamily: "var(--font-body)",
          fontWeight: active ? "var(--weight-semibold)" : "var(--weight-medium)",
          fontSize: "var(--text-base)",
          transition: "all var(--transition-fast)",
          width: "100%",
          whiteSpace: "nowrap",
          textAlign: "left"
        }, children: [
          item.icon && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { fontSize: "18px", lineHeight: 1, flexShrink: 0, width: 22, display: "flex", alignItems: "center", justifyContent: "center" }, children: item.icon }),
          !collapsed && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis" }, children: item.label }),
          !collapsed && item.badge != null && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: {
            background: "var(--lavender-100)",
            color: "var(--lavender-600)",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-bold)",
            padding: "1px 7px",
            borderRadius: "var(--radius-full)",
            flexShrink: 0,
            fontFamily: "var(--font-body)"
          }, children: item.badge })
        ] }, item.id);
      }),
      (userAvatar || userName) && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: {
        marginTop: "auto",
        paddingTop: "var(--space-4)",
        borderTop: "1px solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: collapsed ? 0 : "var(--space-2)",
        justifyContent: collapsed ? "center" : "flex-start",
        overflow: "hidden"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
          "button",
          {
            onClick: onUserClick,
            title: onUserClick ? "View profile" : void 0,
            disabled: !onUserClick,
            style: {
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : "var(--space-3)",
              justifyContent: collapsed ? "center" : "flex-start",
              background: userActive ? "var(--lavender-50)" : "transparent",
              border: "none",
              borderRadius: "var(--radius-lg)",
              cursor: onUserClick ? "pointer" : "default",
              padding: collapsed ? "6px 0" : "6px 8px",
              transition: "background var(--transition-fast)",
              textAlign: "left"
            },
            children: [
              userAvatar,
              !collapsed && userName && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { style: {
                fontFamily: "var(--font-body)",
                fontWeight: "var(--weight-medium)",
                fontSize: "var(--text-sm)",
                color: userActive ? "var(--lavender-600)" : "var(--color-text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1
              }, children: userName })
            ]
          }
        ),
        !collapsed && onSignOut && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "button",
          {
            onClick: onSignOut,
            title: "Sign out",
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              color: "var(--color-text-muted)",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color var(--transition-fast)"
            },
            onMouseEnter: (e) => e.currentTarget.style.color = "var(--color-text)",
            onMouseLeave: (e) => e.currentTarget.style.color = "var(--color-text-muted)",
            children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("svg", { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("polyline", { points: "16 17 21 12 16 7" }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("line", { x1: "21", y1: "12", x2: "9", y2: "12" })
            ] })
          }
        )
      ] })
    ] });
  }

  // src/components/nix/CohortTimer.tsx
  init_define_import_meta_env();
  var import_react2 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime9 = __toESM(require_react_shim(), 1);
  function calc(startDate) {
    const diff = Math.max(0, Date.now() - new Date(startDate).getTime());
    return {
      days: Math.floor(diff / 864e5),
      hours: Math.floor(diff % 864e5 / 36e5),
      mins: Math.floor(diff % 36e5 / 6e4),
      secs: Math.floor(diff % 6e4 / 1e3)
    };
  }
  function CohortTimer({ startDate, label = "Nicotine-free for", style }) {
    const [t, setT] = (0, import_react2.useState)(() => calc(startDate));
    (0, import_react2.useEffect)(() => {
      const id = setInterval(() => setT(calc(startDate)), 1e3);
      return () => clearInterval(id);
    }, [startDate]);
    const units = [
      { value: t.days, lbl: "days" },
      { value: t.hours, lbl: "hrs" },
      { value: t.mins, lbl: "min" },
      { value: t.secs, lbl: "sec" }
    ];
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { textAlign: "center", ...style }, children: [
      label && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: {
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-semibold)",
        color: "var(--color-text-muted)",
        letterSpacing: "var(--tracking-widest)",
        textTransform: "uppercase",
        marginBottom: "var(--space-3)"
      }, children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2 }, children: units.map(({ value, lbl }, i) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_react2.default.Fragment, { children: [
        i > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: {
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          color: "var(--neutral-300)",
          fontWeight: "var(--weight-bold)",
          marginBottom: 18,
          lineHeight: 1,
          padding: "0 1px"
        }, children: ":" }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: {
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-4xl)",
            fontWeight: "var(--weight-extrabold)",
            color: "var(--color-primary)",
            lineHeight: 1,
            letterSpacing: "var(--tracking-tight)"
          }, children: String(value).padStart(2, "0") }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { style: {
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-widest)",
            marginTop: "var(--space-1)"
          }, children: lbl })
        ] })
      ] }, lbl)) })
    ] });
  }

  // src/components/nix/NixDateCard.tsx
  init_define_import_meta_env();
  var import_jsx_runtime10 = __toESM(require_react_shim(), 1);
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var STATUS_MAP = {
    upcoming: { grad: "linear-gradient(135deg,var(--lavender-50) 0%,var(--lavender-100) 100%)", accent: "var(--lavender-600)", light: "var(--lavender-50)", border: "var(--lavender-200)", label: "Upcoming", canJoin: true },
    active: { grad: "linear-gradient(135deg,var(--lavender-100) 0%,var(--lavender-200) 100%)", accent: "var(--lavender-500)", light: "var(--lavender-50)", border: "var(--lavender-200)", label: "Active Now", canJoin: true },
    full: { grad: "linear-gradient(135deg,var(--purple-50) 0%,var(--purple-100) 100%)", accent: "var(--purple-600)", light: "var(--purple-50)", border: "var(--purple-100)", label: "Full", canJoin: false },
    past: { grad: "linear-gradient(135deg,var(--neutral-50) 0%,var(--neutral-100) 100%)", accent: "var(--neutral-500)", light: "var(--neutral-50)", border: "var(--neutral-200)", label: "Past", canJoin: false }
  };
  var BG_COLORS2 = ["var(--lavender-400)", "var(--purple-400)", "var(--lavender-300)", "var(--purple-500)", "var(--lavender-500)"];
  function MemberDot({ name, index }) {
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: {
      width: 26,
      height: 26,
      borderRadius: "50%",
      background: BG_COLORS2[name.charCodeAt(0) % BG_COLORS2.length],
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 10,
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      border: "2px solid white",
      flexShrink: 0,
      marginLeft: index > 0 ? -8 : 0,
      position: "relative",
      zIndex: 10 - index
    }, children: name[0].toUpperCase() });
  }
  function NixDateCard({ month, year, joined = 0, total = 25, status = "upcoming", isJoined = false, onJoin, description, features, members, style }) {
    const monthName = MONTHS[month - 1] ?? "";
    const abbr = monthName.slice(0, 3).toUpperCase();
    const startDate = new Date(year, month - 1, 1);
    const dayName = DAYS[startDate.getDay()];
    const pct = Math.min(100, Math.round(joined / total * 100));
    const spotsLeft = total - joined;
    const sc = STATUS_MAP[status] ?? STATUS_MAP.upcoming;
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { background: "white", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-md)", border: "1px solid var(--color-border-subtle)", overflow: "hidden", ...style }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { background: sc.grad, padding: "18px 22px 16px", display: "flex", flexDirection: "column", gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { background: "rgba(255,255,255,0.78)", color: sc.accent, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: "var(--radius-xs)", padding: "3px 9px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", fontFamily: "var(--font-body)", letterSpacing: "var(--tracking-wide)" }, children: sc.label }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { style: { color: sc.accent, fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", opacity: 0.75 }, children: [
            dayName,
            " \xB7 ",
            abbr,
            " 1, ",
            year
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { fontFamily: "var(--font-display)", fontWeight: "var(--weight-extrabold)", fontSize: "var(--text-2xl)", color: sc.accent, lineHeight: 1 }, children: [
            monthName,
            " ",
            year
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: sc.accent, opacity: 0.65, marginTop: 4 }, children: "Nix Date Cohort \xB7 30 days" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }, children: [
        description && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { style: { fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)", margin: 0 }, children: description }),
        features && features.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: features.map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 9 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { width: 4, height: 4, borderRadius: "50%", background: sc.accent, flexShrink: 0, opacity: 0.6 } }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--color-text)" }, children: f })
        ] }, i)) }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { fontFamily: "var(--font-body)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-text-muted)", letterSpacing: "var(--tracking-wider)" }, children: "SPOTS FILLED" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { style: { fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: sc.accent }, children: [
              joined,
              "/",
              total
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { height: 5, background: "var(--neutral-100)", borderRadius: "var(--radius-full)", overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { width: `${pct}%`, height: "100%", background: sc.accent, borderRadius: "var(--radius-full)", transition: "width 0.6s var(--ease-out)" } }) }),
          spotsLeft > 0 && status !== "past" && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { style: { fontFamily: "var(--font-body)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }, children: [
            spotsLeft,
            " spot",
            spotsLeft !== 1 ? "s" : "",
            " remaining"
          ] })
        ] }),
        members && members.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { display: "flex" }, children: members.slice(0, 5).map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(MemberDot, { name: m, index: i }, m)) }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { style: { fontFamily: "var(--font-body)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }, children: [
            joined,
            " member",
            joined !== 1 ? "s" : "",
            " joined"
          ] })
        ] }),
        isJoined ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { padding: "11px 18px", background: "var(--lavender-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--lavender-200)", display: "flex", alignItems: "center", gap: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { color: "var(--lavender-600)", fontWeight: "var(--weight-semibold)", fontFamily: "var(--font-body)", fontSize: "var(--text-sm)" }, children: "\u2713 You're in this cohort" }) }) : sc.canJoin ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { onClick: onJoin, style: {
          width: "100%",
          padding: "12px 20px",
          background: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          color: sc.accent,
          border: "1.5px solid rgba(150,126,255,0.28)",
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-semibold)",
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(122,98,245,0.10)",
          transition: "all var(--transition-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }, children: "Join this cohort \u2192" }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { padding: "11px 18px", background: sc.light, borderRadius: "var(--radius-md)", border: `1px solid ${sc.border}`, textAlign: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: sc.accent, fontWeight: "var(--weight-medium)" }, children: status === "full" ? "Cohort full \u2014 join the waitlist for the next date" : "This cohort has closed" }) })
      ] })
    ] });
  }
  return __toCommonJS(entry_exports);
})();
window.NixItDS=NixItDS.__dsMainNs?Object.assign({},NixItDS,NixItDS.__dsMainNs,{__dsMainNs:undefined}):NixItDS;
