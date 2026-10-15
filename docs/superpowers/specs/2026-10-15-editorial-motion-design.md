# Editorial motion and visual refinement

Continue the user's selected dark graphite editorial direction and their request for more motion and design. Preserve the existing typography, real project imagery, content, and native scrolling.

The hero uses two masked headline entrances followed by supporting copy and the portrait. A persistent opaque header carries a thin reading-progress rule on article pages. Reveal motion uses one shared easing curve, restrained offsets, and small stagger intervals. Project previews gain a labeled mounting frame, a one-time image wipe, gentle desktop-only image parallax, and clearer link feedback. The Ramco feature gains a factual internship-to-full-time career rail and a warmer graphite surface.

The existing Motion component becomes a shared public-page enhancement through SiteHeader. It resets observers on pathname changes, marks article contents with aria-current, and batches scroll geometry reads before writes. All observers, event listeners, and animation frames are cleaned up. The scroll handler is passive; there is no permanent frame loop or animation dependency added.

Server content remains visible. CSS hero motion works without JavaScript, and all nonessential animation is disabled under prefers-reduced-motion. Parallax is limited to wide, hover-capable screens and a ten-pixel offset. Focus reveals offscreen content immediately. Article text stays in a continuous reading column.

Verification covers the production build and lint, the existing test suite, public routes at 320/390/768/1440 pixels, 200% zoom, reduced motion, no-JavaScript visibility, keyboard skip navigation, client-side route changes, reading progress and contents tracking, and contact success with an intercepted request. No real email or database write is part of UI verification.
