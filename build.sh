#!/bin/sh


inkscape --export-type=png assets/marker/*.svg

magick mogrify -resize 64x64 -path assets/marker/optimized/ -format webp assets/marker/*.png
