import type {
  Layout,
  LayoutWidget,
  LvProj,
  Styles,
  SharedStyle
} from '../project/types';

function toSnakeCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'obj';
}

function validCId(s: string): string {
  return toSnakeCase(s).replace(/^[0-9]/, (c) => `_${c}`);
}

/** Assign stable IDs to widgets; returns map of path -> id */
function assignIds(root: LayoutWidget, prefix: string, out: Map<string, string>): void {
  const id = root.id ? validCId(root.id) : `${validCId(root.type)}_${prefix}`;
  const path = prefix || 'root';
  out.set(path, id);

  (root.children ?? []).forEach((c, i) => {
    assignIds(c, `${path}_${i}`, out);
  });
}

/** Event property -> LVGL event code */
const EVENT_MAP: Record<string, string> = {
  onClick: 'LV_EVENT_CLICKED',
  onClicked: 'LV_EVENT_CLICKED',
  onValueChanged: 'LV_EVENT_VALUE_CHANGED',
  onPressed: 'LV_EVENT_PRESSED',
  onReleased: 'LV_EVENT_RELEASED',
  onFocus: 'LV_EVENT_FOCUSED',
  onFocused: 'LV_EVENT_FOCUSED',
  onDefocus: 'LV_EVENT_DEFOCUSED',
  onDefocused: 'LV_EVENT_DEFOCUSED'
};

/** Map LVGL widget type to create function name */
function lvCreateFunc(type: string): string {
  const t = type.toLowerCase();
  if (t === 'obj' || t === 'object') return 'lv_obj_create';
  if (t === 'btn' || t === 'button') return 'lv_btn_create';
  if (t === 'label') return 'lv_label_create';
  if (t === 'img' || t === 'image') return 'lv_img_create';
  if (t === 'slider') return 'lv_slider_create';
  if (t === 'bar') return 'lv_bar_create';
  if (t === 'switch') return 'lv_switch_create';
  if (t === 'checkbox') return 'lv_checkbox_create';
  if (t === 'dropdown') return 'lv_dropdown_create';
  if (t === 'roller') return 'lv_roller_create';
  if (t === 'textarea') return 'lv_textarea_create';
  if (t === 'canvas') return 'lv_canvas_create';
  if (t === 'arc') return 'lv_arc_create';
  if (t === 'spinner') return 'lv_spinner_create';
  return 'lv_obj_create';
}

/** Emit lv_style_set_* calls for a shared style */
function emitStyleProps(style: SharedStyle, varName: string, indent: string): string[] {
  const lines: string[] = [];
  if (typeof style.bg_color === 'number') {
    lines.push(`${indent}lv_style_set_bg_color(&${varName}, lv_color_hex(0x${style.bg_color.toString(16).padStart(6, '0')}));`);
  }
  if (typeof style.bg_opa === 'number') {
    lines.push(`${indent}lv_style_set_bg_opa(&${varName}, ${style.bg_opa});`);
  }
  if (typeof style.border_width === 'number') {
    lines.push(`${indent}lv_style_set_border_width(&${varName}, ${style.border_width});`);
  }
  if (typeof style.border_color === 'number') {
    lines.push(`${indent}lv_style_set_border_color(&${varName}, lv_color_hex(0x${style.border_color.toString(16).padStart(6, '0')}));`);
  }
  if (typeof style.radius === 'number') {
    lines.push(`${indent}lv_style_set_radius(&${varName}, ${style.radius});`);
  }
  if (typeof style.pad_all === 'number') {
    lines.push(`${indent}lv_style_set_pad_all(&${varName}, ${style.pad_all});`);
  }
  if (typeof style.text_color === 'number') {
    lines.push(`${indent}lv_style_set_text_color(&${varName}, lv_color_hex(0x${style.text_color.toString(16).padStart(6, '0')}));`);
  }
  return lines;
}

/** Get event key suffix for handler name, e.g. onClicked -> clicked */
function eventKeySuffix(key: string): string {
  const s = key.replace(/^on/, '');
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Resolve handler name from binding; returns [handlerName, isAutoStub] */
function resolveEventHandler(
  binding: unknown,
  widgetId: string,
  eventKey: string
): [string, boolean] | null {
  if (binding === undefined || binding === null) return null;
  if (typeof binding === 'string' && binding.trim()) {
    return [validCId(binding.trim()), false];
  }
  if (binding === true || (typeof binding === 'object' && binding !== null)) {
    const suffix = eventKeySuffix(eventKey);
    return [`ui_${widgetId}_${suffix}`, true];
  }
  return null;
}

/** Collect event bindings for a widget: eventKey -> [handlerName, isAutoStub] */
function getWidgetEventBindings(
  w: LayoutWidget,
  widgetId: string
): Array<{ eventCode: string; handlerName: string; guardId: string }> {
  const out: Array<{ eventCode: string; handlerName: string; guardId: string }> = [];
  for (const [key, code] of Object.entries(EVENT_MAP)) {
    const binding = w[key];
    const resolved = resolveEventHandler(binding, widgetId, key);
    if (resolved) {
      const [handlerName, isAuto] = resolved;
      const guardId = isAuto ? `${widgetId}_${eventKeySuffix(key)}` : undefined;
      out.push({
        eventCode: code,
        handlerName,
        guardId: guardId ?? handlerName
      });
    }
  }
  return out;
}

/** Emit C code for a widget subtree */
function emitWidget(
  w: LayoutWidget,
  path: string,
  parentVar: string,
  idMap: Map<string, string>,
  styleMap: Map<string, string>,
  indent: string
): string[] {
  const id = idMap.get(path);
  if (!id) return [];
  const varName = `ui_${id}`;
  const createFn = lvCreateFunc(w.type);
  const lines: string[] = [];
  lines.push(`${indent}${varName} = ${createFn}(${parentVar});`);
  const styleId = typeof w.styleId === 'string' ? w.styleId : undefined;
  if (styleId && styleMap.has(styleId)) {
    lines.push(`${indent}lv_obj_add_style(${varName}, &ui_style_${validCId(styleId)}, 0);`);
  }
  (w.children ?? []).forEach((c, i) => {
    lines.push(
      ...emitWidget(c, `${path}_${i}`, varName, idMap, styleMap, indent)
    );
  });
  const bindings = getWidgetEventBindings(w, id);
  for (const { eventCode, handlerName } of bindings) {
    lines.push(`${indent}lv_obj_add_event_cb(${varName}, ${handlerName}, ${eventCode}, NULL);`);
  }
  return lines;
}

/** Collect auto-generated event handler stubs for the layout */
function collectEventHandlerStubs(
  root: LayoutWidget,
  idMap: Map<string, string>,
  path = 'root'
): Array<{ handlerName: string; guardId: string }> {
  const stubs: Array<{ handlerName: string; guardId: string }> = [];
  const id = idMap.get(path);
  if (id) {
    const bindings = getWidgetEventBindings(root, id);
    for (const b of bindings) {
      if (b.handlerName.startsWith('ui_')) {
        stubs.push({ handlerName: b.handlerName, guardId: b.guardId });
      }
    }
  }
  (root.children ?? []).forEach((c, i) => {
    stubs.push(...collectEventHandlerStubs(c, idMap, `${path}_${i}`));
  });
  return stubs;
}

/** Build map of shared style id -> valid C id */
function buildStyleMap(styles: Styles): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of styles.shared) {
    if (typeof s.id === 'string' && s.id) m.set(s.id, validCId(s.id));
  }
  return m;
}

/** Generate ui.h content */
export function generateUiH(
  layout: Layout,
  _lvproj: LvProj,
  styles: Styles
): string {
  const lines: string[] = [];
  lines.push('/* Generated by LVCraft - do not edit */');
  lines.push('#ifndef UI_H');
  lines.push('#define UI_H');
  lines.push('');
  lines.push('#include "lvgl.h"');
  lines.push('');

  const styleMap = buildStyleMap(styles);
  styleMap.forEach((cId) => {
    lines.push(`extern lv_style_t ui_style_${cId};`);
  });
  if (styleMap.size) lines.push('');

  if (layout.root) {
    const idMap = new Map<string, string>();
    assignIds(layout.root, 'root', idMap);
    idMap.forEach((id) => {
      lines.push(`extern lv_obj_t *ui_${id};`);
    });
    lines.push('');
  }

  lines.push('void ui_init(void);');
  lines.push('');
  lines.push('#endif');
  return lines.join('\n');
}

/** Generate ui.c content */
export function generateUiC(
  layout: Layout,
  _lvproj: LvProj,
  styles: Styles
): string {
  const lines: string[] = [];
  lines.push('/* Generated by LVCraft - do not edit */');
  lines.push('#include "ui.h"');
  lines.push('');

  const styleMap = buildStyleMap(styles);
  for (const s of styles.shared) {
    if (typeof s.id !== 'string' || !s.id) continue;
    const cId = validCId(s.id);
    lines.push(`lv_style_t ui_style_${cId};`);
  }
  if (styleMap.size) lines.push('');

  if (!layout.root) {
    lines.push('void ui_init(void) {');
    lines.push('  /* Empty layout */');
    lines.push('  /* USER CODE BEGIN init */');
    lines.push('  /* USER CODE END init */');
    lines.push('}');
    return lines.join('\n');
  }

  const idMap = new Map<string, string>();
  assignIds(layout.root, 'root', idMap);
  idMap.forEach((id) => {
    lines.push(`lv_obj_t *ui_${id} = NULL;`);
  });
  const eventStubs = collectEventHandlerStubs(layout.root, idMap);
  const seenHandlers = new Set<string>();
  for (const { handlerName, guardId } of eventStubs) {
    if (seenHandlers.has(handlerName)) continue;
    seenHandlers.add(handlerName);
    lines.push('');
    lines.push(`static void ${handlerName}(lv_event_t * e) {`);
    lines.push(`  lv_obj_t * obj = lv_event_get_target(e);`);
    lines.push(`  /* USER CODE BEGIN ${guardId} */`);
    lines.push(`  /* USER CODE END ${guardId} */`);
    lines.push('}');
  }
  if (eventStubs.length) lines.push('');
  lines.push('void ui_init(void)');
  lines.push('{');
  const body: string[] = [];
  for (const s of styles.shared) {
    if (typeof s.id !== 'string' || !s.id) continue;
    const cId = validCId(s.id);
    body.push(`  lv_style_init(&ui_style_${cId});`);
    body.push(...emitStyleProps(s as SharedStyle, `ui_style_${cId}`, '  '));
    body.push('');
  }
  body.push(
    ...emitWidget(
      layout.root,
      'root',
      'NULL',
      idMap,
      styleMap,
      '  '
    )
  );
  lines.push(...body);
  lines.push('  /* USER CODE BEGIN init */');
  lines.push('  /* USER CODE END init */');
  lines.push('}');
  return lines.join('\n');
}
