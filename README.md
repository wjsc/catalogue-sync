# catalogue-sync
Adds static files to database

db.artists.drop(); db.albums.drop(); db.tracks.drop(); db.favorites.drop(); db.historys.drop();
db.artists.createIndex( { name: "text"} ); db.albums.createIndex( { title: "text"} ); db.tracks.createIndex( { title: "text"} );

db.artists.getIndexes();
db.artists.dropIndex("title_text");
db.artists.createIndex( { name: "text"} );
