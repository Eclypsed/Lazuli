<script lang="ts">
    export let type: ConnectionType
</script>

{#if type === 'jellyfin'}
    <!-- ***** BEGIN LICENSE BLOCK *****
  - Part of the Jellyfin project (https://jellyfin.media)
  - 
  - All copyright belongs to the Jellyfin contributors; a full list can
  - be found in the file CONTRIBUTORS.md
  - 
  - This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
  - To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/.
- ***** END LICENSE BLOCK ***** -->
    <svg version="1.1" id="icon-transparent" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512">
        <defs>
            <linearGradient id="linear-gradient" gradientUnits="userSpaceOnUse" x1="110.25" y1="213.3" x2="496.14" y2="436.09">
                <stop offset="0" style="stop-color:#AA5CC3" />
                <stop offset="1" style="stop-color:#00A4DC" />
            </linearGradient>
        </defs>
        <title>icon-transparent</title>
        <g id="icon-transparent">
            <path id="inner-shape" d="M256,201.6c-20.4,0-86.2,119.3-76.2,139.4s142.5,19.9,152.4,0S276.5,201.6,256,201.6z" fill="url(#linear-gradient)" />
            <path
                id="outer-shape"
                d="M256,23.3c-61.6,0-259.8,359.4-229.6,420.1s429.3,60,459.2,0S317.6,23.3,256,23.3z
		M406.5,390.8c-19.6,39.3-281.1,39.8-300.9,0s110.1-275.3,150.4-275.3S426.1,351.4,406.5,390.8z"
                fill="url(#linear-gradient)"
            />
        </g>
    </svg>
{:else if type === 'youtube-music'}
    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 176 176" enable-background="new 0 0 176 176" xml:space="preserve">
        <metadata>
            <sfw xmlns="&ns_sfw;">
                <slices></slices>
                <sliceSourceBounds bottomLeftOrigin="true" height="176" width="176" x="8" y="-184"></sliceSourceBounds>
            </sfw>
        </metadata>
        <g id="XMLID_167_">
            <circle id="XMLID_791_" fill="#FF0000" cx="88" cy="88" r="88" />
            <path
                id="XMLID_42_"
                fill="#FFFFFF"
                d="M88,46c23.1,0,42,18.8,42,42s-18.8,42-42,42s-42-18.8-42-42S64.9,46,88,46 M88,42
   c-25.4,0-46,20.6-46,46s20.6,46,46,46s46-20.6,46-46S113.4,42,88,42L88,42z"
            />
            <polygon id="XMLID_274_" fill="#FFFFFF" points="72,111 111,87 72,65" />
        </g>
    </svg>
{/if}

<style>
    svg {
        max-width: 100%;
        max-height: 100%;
    }
</style>
