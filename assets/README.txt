Launch-screen background photo
==============================

Drop your golfer photo here and name it exactly:

    launch.jpg

The launch screen (first entry) uses it full-bleed:
    styles.css  ->  .launch-bg { background-image: url(assets/launch.jpg) }

If this file is missing, a premium golf-toned gradient is shown instead, so
the screen never looks broken.

For the single-file builds (standalone.html) and the shared Artifact, the
build step base64-embeds launch.jpg automatically the next time it runs — so
the photo travels with those self-contained files too.

Recommended: a portrait (roughly 3:4 or taller) JPG, ~1200px wide or more.
