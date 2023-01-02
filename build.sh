#!/bin/sh

mkdir -p vendor
aria2c -i vendor.txt -d vendor/ --auto-file-renaming=false --allow-overwrite=true

inkscape --export-type=png assets/marker/*.svg

magick mogrify -resize 64x64 -path assets/marker/optimized/ -format webp assets/marker/*.png
