/* 
 * ===================================================================
 * jQuery JS
 * ===================================================================
 */

/*
(function ($) {

})(jQuery);
*/

/* 
 * ===================================================================
 * Vanilla JS
 * ===================================================================
 */

(function (html) {

    'use strict';

    /* move header
     * -------------------------------------------------- */
    const ssMoveHeader = function () {

        const header = document.querySelector('.cw-header');
        const hero = document.querySelector('.cw-cover');
        const triggerScrollY = 0;
        const currentScroll = window.pageYOffset;

        let triggerHeight;

        if (!(header && hero)) return;

        header.classList.add('visible');

        if (currentScroll > 0) {
            header.classList.add('sticky');
        }

        if (triggerScrollY > 0) {

            setTimeout(function () {
                triggerHeight = hero.offsetHeight - 96;
            }, 300);

        } else {

            triggerHeight = 0;

        }


        window.addEventListener('scroll', function () {

            let loc = window.scrollY;

            if (loc > triggerHeight) {
                header.classList.add('sticky');
            } else {
                header.classList.remove('sticky');
            }

            if (loc > triggerHeight + 96) {
                header.classList.add('offset');
            } else {
                header.classList.remove('offset');
            }

            if (loc > triggerHeight + 150) {
                header.classList.add('scrolling');
            } else {
                header.classList.remove('scrolling');
            }

        });

    }; // end ssMoveHeader


    /* Back to Top
     * ------------------------------------------------------ */
    const ssBackToTop = function () {

        const pxShow = 900;
        const goTopButton = document.querySelector(".cw-btp");

        if (!goTopButton) return;

        // Show or hide the button
        if (window.scrollY >= pxShow) goTopButton.classList.add("link-is-visible");

        window.addEventListener('scroll', function () {
            if (window.scrollY >= pxShow) {
                if (!goTopButton.classList.contains('link-is-visible')) goTopButton.classList.add("link-is-visible")
            } else {
                goTopButton.classList.remove("link-is-visible")
            }
        });

    }; // end ssBackToTop


    /* smoothscroll
     * ------------------------------------------------------ */
    const ssMoveTo = function () {

        const easeFunctions = {
            easeInQuad: function (t, b, c, d) {
                t /= d;
                return c * t * t + b;
            },
            easeOutQuad: function (t, b, c, d) {
                t /= d;
                return -c * t * (t - 2) + b;
            },
            easeInOutQuad: function (t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t + b;
                t--;
                return -c / 2 * (t * (t - 2) - 1) + b;
            },
            easeInOutCubic: function (t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t * t + b;
                t -= 2;
                return c / 2 * (t * t * t + 2) + b;
            }
        }

        const triggers = document.querySelectorAll('.smoothscroll');

        const moveTo = new MoveTo({
            tolerance: 0,
            duration: 1200,
            easing: 'easeInOutCubic',
            container: window
        }, easeFunctions);

        triggers.forEach(function (trigger) {
            moveTo.registerTrigger(trigger);
        });

    }; // end ssMoveTo


    /* Initialize
     * ------------------------------------------------------ */
    (function ssInit() {

        ssMoveHeader();
        ssBackToTop();
        // ssMoveTo();

    })();

})(document.documentElement);