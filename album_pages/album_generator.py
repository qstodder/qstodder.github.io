import pandas
import os

# create function for html and css
def mk_html(folder, pics, title, background, description):
    str_start = """<!DOCTYPE html>
    <html lang="en">
        <head>
            <title>""" + title + """</title>
            <link rel="stylesheet" href="../../styles.css">
            <link rel="stylesheet" href="header.css">
        </head>
    <div style="background:""" + background + """;padding:15px;">
        <a href="../../index.html" class="return" style="text-align:left;">q u i n o t o p i a</a>
    </div>
    <header>
        <h1>""" + title + """</h1>
        <p>""" + description + """ </p>
    </header>
    <body>
        <ul>"""
    # enter each picture: loop len(pics) times
    str_mid = ""
    for pic in pics:
        str_mid = str_mid + "<li> <img src='"+ pic + "'> </li>" + '\n\t\t'

    str_end= """</ul> 
    </body>
    </html>"""
    str_final = str_start + str_mid + str_end
    name = folder.split('/')[1] + '.html'
    h = os.path.join(folder, name)
    f = open(h, 'w+')
    f.write(str_final)
    f.close()
    print(folder + " html done")


def mk_css(folder, c_title, c_rturn, c_desc, background):
    str_final = """ header{
        padding: 100px;
        padding-top: 60px;
        /* top */
        font-size: 20px;
        color: """ + c_title + """;
        background-color: """ + background + """;
        text-align: center;
    }
    a.return {
        color: """ + c_rturn + """;
        text-align: left;
    }
    a.return:link {text-decoration: none}
    a.return:hover {text-decoration: underline}
    h1 {text-align: center;}
    p {
        font-size: 20px;
        color: """ + c_desc + """; 
        text-align: center; 
    }  """
    # create css file
    h = os.path.join(folder, 'header.css')
    f = open(h, 'w+')
    f.write(str_final)
    f.close()
    print(folder+ " css done")

# retreive strings from .xlsx file
deets = pandas.read_excel(r'album_pages/descriptions.xlsx')

# list of allowable pic suffixes
suffixes = ['jpg', 'png', 'jpeg']

# loop through each album in folder 'album_pages'
albums = [x[0] for x in os.walk('album_pages')]
for i, album in enumerate(albums):
    print(album)
    if i > 0:
        files = [x[2] for x in os.walk(album)]
        pics = []
        for f in files[0]:
            suffix = f.split(".")[1]
            if suffix.lower() in suffixes:
                pics.append(f)
        aI = deets.folder[deets.folder == album.split('/')[1]].index[0]
        mk_html(album, pics, deets.title[aI], deets.background[aI], deets.description[aI])
        mk_css(album, deets.title_color[aI], deets.rturn[aI], deets.desc_color[aI], deets.background[aI])
        
        
        
        

           



