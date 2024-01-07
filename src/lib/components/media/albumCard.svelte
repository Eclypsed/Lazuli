<script>
    export let item;
    export let cardType;

    import { JellyfinUtils } from '$lib/utils'

    const getAlbumCardLink = (item) => {
        if (cardType === "albums") {
            return `/album/${item.Id}`;
        } else if (cardType === "appearances") {
            return `/album/${item.AlbumId}`;
        } else if (cardType === "singles") {
            return `/song/${item.Id}`
        } else {
            throw new Error("No such cardType: " + cardType);
        };
    };
</script>

<a href={getAlbumCardLink(item)} style="text-decoration: none;">
    <div class="image-card">
        <img src="{JellyfinUtils.getImageEnpt('Primary' in item.ImageTags ? item.Id : item.AlbumId)}" alt="jacket">
        <span>{item.Name}</span>
    </div>
</a>

<style>
    .image-card {
        width: 100%;
        aspect-ratio: 0.8;
        background-color: rgb(32, 32, 32);
        margin: 0;
    }
    img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
    }
    span {
        color: white;
        text-align: center;
    }
</style>