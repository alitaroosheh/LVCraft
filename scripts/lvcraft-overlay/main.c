/**
 * @file main
 * LVCraft patched: skips demo when Module.lvcraft_layout is set (Designer live preview).
 */

/*********************
 *      INCLUDES
 *********************/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#define SDL_MAIN_HANDLED
#include <SDL2/SDL.h>
#include <emscripten.h>
#include "lvgl/lvgl.h"
#include "lvgl/demos/lv_demos.h"

#include "examplelist.h"

/*********************
 *      DEFINES
 *********************/
#if defined(__APPLE__) && defined(TARGET_OS_MAC)
# if __APPLE__ && TARGET_OS_MAC
#define SDL_APPLE
# endif
#endif

/**********************
 *  STATIC PROTOTYPES
 **********************/
static void hal_init(void);

/**********************
 *  STATIC VARIABLES
 **********************/
int monitor_hor_res, monitor_ver_res;

/**********************
 *   GLOBAL FUNCTIONS
 **********************/
void do_loop(void *arg);

EM_JS(int, lvcraft_has_layout, (void), {
  return (typeof Module !== 'undefined' && Module.lvcraft_layout) ? 1 : 0;
});

EM_JS(int, lvcraft_canvas_width, (void), {
  try {
    if (typeof Module === 'undefined') return 0;
    if (!Module.canvas) return 0;
    return (Module.canvas.width | 0) || 0;
  } catch (e) {
    return 0;
  }
});

EM_JS(int, lvcraft_canvas_height, (void), {
  try {
    if (typeof Module === 'undefined') return 0;
    if (!Module.canvas) return 0;
    return (Module.canvas.height | 0) || 0;
  } catch (e) {
    return 0;
  }
});

/** Set label (or any object) text color from JS. hex_color is 0xRRGGBB. */
void lvcraft_obj_set_style_text_color(lv_obj_t *obj, uint32_t hex_color)
{
    if (obj) lv_obj_set_style_text_color(obj, lv_color_hex(hex_color), 0);
}

static void lv_example_noop(void) {
}

int main(int argc, char ** argv)
{
    extern const struct lv_ci_example lv_ci_example_list[];
    const struct lv_ci_example *ex = NULL;
    monitor_hor_res = (argc >= 2 && argv[1]) ? atoi(argv[1]) : 0;
    monitor_ver_res = (argc >= 3 && argv[2]) ? atoi(argv[2]) : 0;

    /* LVCraft robustness: some hosts (webviews) can end up passing 0/invalid argv.
       If that happens, fall back to the actual canvas size (set by the extension). */
    if (monitor_hor_res <= 0 || monitor_ver_res <= 0) {
        int cw = lvcraft_canvas_width();
        int ch = lvcraft_canvas_height();
        if (cw > 0) monitor_hor_res = cw;
        if (ch > 0) monitor_ver_res = ch;
    }
    if (monitor_hor_res <= 0) monitor_hor_res = 320;
    if (monitor_ver_res <= 0) monitor_ver_res = 240;

    if (argc >= 4 && argv[3] && strcmp(argv[3], "default")) {
        for (ex = &lv_ci_example_list[0]; ex->name != NULL; ex++) {
            if (!strcmp(ex->name, argv[3])) break;
        }
        if (ex->name == NULL) fprintf(stderr, "Unable to find requested example\n");
    }
    printf("Starting with screen resolution of %dx%d px\n", monitor_hor_res, monitor_ver_res);

    lv_init();
    hal_init();

    /* LVCraft: skip demo when layout provided - JS will build UI from layout.json */
    if (!lvcraft_has_layout()) {
        if(ex != NULL && ex->fn != NULL) {
            ex->fn();
        } else {
            extern void CHOSEN_DEMO(void);
            CHOSEN_DEMO();
        }
    }

    emscripten_set_main_loop_arg(do_loop, NULL, -1, true);
}

void do_loop(void *arg)
{
    lv_task_handler();
}

static void hal_init(void)
{
    lv_sdl_window_create(monitor_hor_res, monitor_ver_res);
    lv_group_t * g = lv_group_create();
    lv_group_set_default(g);
    lv_indev_t * mouse = lv_sdl_mouse_create();
    lv_indev_set_group(mouse, lv_group_get_default());
    lv_indev_t * mousewheel = lv_sdl_mousewheel_create();
    lv_indev_set_group(mousewheel, lv_group_get_default());
    lv_indev_t * keyboard = lv_sdl_keyboard_create();
    lv_indev_set_group(keyboard, lv_group_get_default());
}
