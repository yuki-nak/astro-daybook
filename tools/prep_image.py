#!/usr/bin/env python3
"""Prepare a photo for a post.

- Rotate according to the camera's orientation tag
- Shrink so the long side is at most 1600px
- Save as JPEG (quality 82)
- Drop all EXIF data, including GPS location

Usage: python3 tools/prep_image.py input-file output.jpg
"""
import sys

from PIL import Image, ImageOps

try:  # HEIC (iPhone) support, if pillow-heif is installed; otherwise JPEG/PNG only
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:
    pass


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, dst = sys.argv[1], sys.argv[2]
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        im.thumbnail((1600, 1600))
        im.save(dst, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"{dst}: {im.width}x{im.height}")


if __name__ == "__main__":
    main()
