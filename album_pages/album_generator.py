import pandas
import os

# create function for html and css
def mk_html(folder, pics, title, color, description):
    str_start = """<!DOCTYPE html>
    <html lang="en">
        <head>
            <title>""" + title + """</title>
            <link rel="stylesheet" href="../../styles.css">
            <link rel="stylesheet" href="header.css">
        </head>
    <div style="background:""" + color + """;padding:15px;">
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
        str_mid = str_mid + "<li> <img src='../../"+ pic + "'> </li>" + '\n\t\t'

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


def mk_css(folder, header, rturn, desc):
    str_final = """ header{
        padding: 100px;
        padding-top: 60px;
        /* top */
        font-size: 20px;
        color: """ + header + """;
        background-color: rgb(0, 0, 0);
        text-align: center;
    }
    a.return {
        color: """ + rturn + """;
        text-align: left;
    }
    a.return:link {text-decoration: none}
    a.return:hover {text-decoration: underline}
    h1 {text-align: center;}
    p {
        font-size: 20px;
        color: """ + desc + """; 
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

# loop through each album in folder 'album_pages'
albums = [x[0] for x in os.walk('album_pages')]
for i, album in enumerate(albums):
    print(album)
    if i > 0:
        pics = [x[2] for x in os.walk(album)]
        aI = deets.folder[deets.folder == album.split('/')[1]].index[0]
        mk_html(album, pics[0], deets.title[aI], deets.background[aI], deets.description[aI])
        mk_css(album, deets.background[aI], deets.rturn[aI], deets.desc_color[aI])
        
        
        
        
        
        # str_start = """<!DOCTYPE html>
        # <html lang="en">
        #     <head>
        #         <title>""" + deets.title[aI] + """</title>
        #         <link rel="stylesheet" href="../../styles.css">
        #         <link rel="stylesheet" href="header.css">
        #     </head>
        # <div style="background:""" + deets.background[aI] + """;padding:15px;">
        #     <a href="../../index.html" class="return" style="text-align:left;">q u i n o t o p i a</a>
        # </div>
        # <header>
        #     <h1>""" + deets.title[aI] + """</h1>
        #     <p>""" + deets.description[aI] + """ </p>
        # </header>
        # <body>
        #     <ul>"""
        # # enter each picture: loop len(pics) times
        # str_mid = ""
        # for pic in pics[0]:
        #     str_mid = str_mid + "<li> <img src='../../"+ pic + "'> </li>"

        # str_end= """</ul> 
        # </body>
        # </html>"""
        # str_final = str_start + str_mid + str_end
        # name = album.split('/')[1] + '.html'
        # h = os.path.join(album, name)
        # f = open(h, 'w+')
        # f.write(str_final)
        # f.close()
        # print(album+ " html done")
           



