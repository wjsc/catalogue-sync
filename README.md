# catalogue-sync
Adds static files to database

db.artists.drop(); db.albums.drop(); db.tracks.drop(); db.favorites.drop();
db.artists.createIndex( { title: "text"} ); db.albums.createIndex( { title: "text"} ); db.tracks.createIndex( { title: "text"} );
