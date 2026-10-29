# Aldric v0.8 test

This branch contains the v0.8 Aldric integration behind the `?aldric08` URL flag. The original animations remain available without this flag.

Upload the 10 WebP files from `aldric_v08_ready.zip` into `prototype/infinite-dungeon/img/aldric-v08/` preserving their filenames. The ZIP contains an optional alternative attack series (`atk_alt`) not currently used.

The existing combat engine preloads the sprites and plays 6 Idle and 4 Attack frames for Aldric. Other actions retain their original Dragonbound II animation. The artwork is extracted from user-provided sprite sheets and needs visual inspection for chroma-key edges.

GitHub Pages only serves the branch configured for Pages; this branch may require a preview deployment before the test URL works.
