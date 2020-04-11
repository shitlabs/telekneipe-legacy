mkdir dist

cp -r js pics css sprites dist/
python ../fabulation/fabulation.py -d -f clubMarke -c cookiesDont main.yml dist/index.html
python ../fabulation/fabulation.py -d -f clubMarke -c cookiesDont main_en.yml dist/index_en.html
