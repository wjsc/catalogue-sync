const config = require("config");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const mm = require('musicmetadata');
const uuid = require('uuid/v4');

const processDir = async dir => {
    let dirs = await getDirs(dir);
    for(dir of dirs){
        await processArtistDir(dir);
    }
}

const processArtistDir = async dir => {
    console.log(dir);
    const dirs = await getDirs(dir)
    const ids = [];
    let firstTag = false;
    const artistId = uuid(dir);
    const artistName = relativeToConfigDir(dir);
    for(dir of dirs){
        const obj = await processAlbumDir(dir, artistId, artistName);
        ids.push(obj.id);
        if(!firstTag) firstTag = obj.firstTag;
    }
    const artist = buildArtist(firstTag, ids, artistId);
    const res = await postArtist(artist, artistId);
}

const getDirs = (dir) => {
    return new Promise (resolve => fs.readdir(dir, (err, files) => 
        resolve( 
            files.map(file => path.join(dir, file))
            .filter(file => !fs.statSync(file).isFile())
        )
    ))
}

const processAlbumDir = async (dir, artistId, artistName) => {
    const audios = await getAudios(dir);
    const firstTag = await getTag(audios[0]);
    const cover = getCover(dir);
    const ids = [];
    const albumId = uuid(firstTag.album);
    const albumTitle = firstTag.album;
    for(audio of audios){
        const tag = await getTag(audio);
        const trackId = uuid(tag.title);
        const track = buildTrack(tag, audio, trackId, albumId, albumTitle, artistId, artistName);
        const res = await postTrack(track);
        ids.push(res.id);
    }
    const album = buildAlbum(firstTag, cover, ids, artistId, artistName, albumId);
    const res = await postAlbum(album);
    return {firstTag: firstTag, id: res.id};
}

const getAudios = dir => { 
    return new Promise (resolve => fs.readdir(dir, (err, files) => 
                resolve( 
                    files.map(file => path.join(dir, file))
                    .filter(file => fs.statSync(file).isFile())
                    .filter(file => file.indexOf('mp3')>1)
                )
            ))
}

const getCover = dir => {
    const cover = dir+'/cover.jpg';
    return fs.statSync(cover).isFile() ? cover : '';
}

const getTag = file => {
    return new Promise((resolve, reject) => 
        mm(fs.createReadStream(file), { duration: true }, (err, metadata) => {
            if (err) reject(err);
            resolve(metadata);
        })
    )
}

const buildTrack = (tag, audio, trackId, albumId, albumTitle, artistId, artistName) => {
    return {
        artist: { 
            _id: artistId,
            name: artistName
        },
        album: {
            _id: albumId, 
            title: albumTitle
        },
        _id: trackId,
        title: tag.title,
        no: tag.track.no,
        duration: tag.duration,
        audio: relativeToConfigDir(audio)
    }
}

const buildArtist = (firstTag, ids, artistId) => {
    return {
        _id: artistId,
        name: firstTag.artist[0],
        albums: ids
    }
}

const buildAlbum = (firstTag, cover, ids, artistId, artistName, albumId) => {
    return {
        _id: albumId,
        artist: { 
            _id: artistId,
            name: artistName
        },
        title: firstTag.album,
        year: firstTag.year,
        tracks: ids,
        cover: relativeToConfigDir(cover)

    }
}

const postTrack = track => postToApi('track', track);

const postAlbum = album => postToApi('album', album);

const postArtist = artist => postToApi('artist', artist);

const postToApi = (endpoint, object) => {   
    return fetch(config.get("api.host")+endpoint, {
        method:'POST',
        body: JSON.stringify(object),
        headers:{
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }).then(res => res.json()).then(obj => console.log(obj) || obj);
}

const relativeToConfigDir = (file) => {
    return path.relative(config.get("audio_dir"), file);
}
process.argv[2] ?
processDir(config.get('audio_dir'))
: processArtistDir(config.get('audio_dir')+process.argv[2]);
