#!/bin/sh

mkdir -p vendor
aria2c -i vendor.txt -d vendor/ --auto-file-renaming=false --allow-overwrite=true

mkdir -p assets/marker/{tmp,optimized}
cp assets/marker/*.* assets/marker/tmp/
inkscape --export-type=png assets/marker/tmp/*.svg

magick mogrify -resize 32x32 -path assets/marker/optimized/ -format webp assets/marker/tmp/*.png

rm -rf assets/marker/tmp/
