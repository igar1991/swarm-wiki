console.log('iframe script ok')

// window.addEventListener("message", (event) => {
//     const {data} = event;
//     console.log(data)
//
//     if (data.action !== 'setSrc') {
//         return
//     }
//
//     const img = document.querySelector(`img[src="${data.oldSrc}"]`)
//     if (img) {
//         img.setAttribute('src', data.newSrc)
//     } else {
//         console.log('oldSrc not found', data.oldSrc)
//     }
//
// }, false);