const config = require("config");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const mm = require('musicmetadata');

const processArtistDir = async dir => {
    const dirs = await getDirs(dir)
    const ids = [];
    let firstTag = false;
    for(dir of dirs){
        const obj = await processAlbumDir(dir);
        ids.push(obj.id);
        if(!firstTag) firstTag = obj.firstTag;
    }
    const artist = buildArtist(firstTag, ids);
    const res = await postArtist(artist);
}

const getDirs = (dir) => {
    return new Promise (resolve => fs.readdir(dir, (err, files) => 
        resolve( 
            files.map(file => path.join(dir, file))
            .filter(file => !fs.statSync(file).isFile())
        )
    ))
}

const processAlbumDir = async dir => {
    const audios = await getAudios(dir);
    const firstTag = await getTag(audios[0]);
    const cover = getCover(dir);
    const ids = [];
    for(audio of audios){
        const tag = await getTag(audio);
        const track = buildTrack(tag, audio);
        const res = await postTrack(track);
        ids.push(res.id);
    }
    const album = buildAlbum(firstTag, cover, ids);
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
        mm(fs.createReadStream(file), (err, metadata) => {
            if (err) reject(err);
            resolve(metadata);
        })
    )
}

const buildTrack = (tag, audio) => {
    return {
        title: tag.title,
        duration: tag.duration || 1,
        audio: audio.slice(config.get("audio_dir").length)
    }
}

const buildArtist = (firstTag, ids) => {
    return {
        name: firstTag.artist[0],
        albums: ids
    }
}

const buildAlbum = (firstTag, cover, ids) => {
    return {
        title: firstTag.album,
        year: firstTag.year,
        tracks: ids,
        cover: cover.slice(config.get("audio_dir").length)

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
    }).then(res => res.json())
}

processArtistDir(config.get("audio_dir")+'Radiohead');