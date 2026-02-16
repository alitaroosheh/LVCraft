/**
 * @file main
 * LVCraft patched: skips demo when Module.lvcraft_layout is set (Designer live preview).
 */

/*********************
 *      INCLUDES
 *********************/
#include <stdlib.h>
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

static void lv_example_noop(void) {
}

int main(int argc, char ** argv)
{
    extern const struct lv_ci_example lv_ci_example_list[];
    const struct lv_ci_example *ex = NULL;
    monitor_hor_res = atoi(argv[1]);
    monitor_ver_res = atoi(argv[2]);
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
