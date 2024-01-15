<script>
    import Alert from './alert.svelte'

    let alertBox
    let alertQueue = []

    export const addAlert = (alertType, alertMessage) => {
        if (alertQueue.length > 5) {
            alertQueue[0].triggerClose()
        }

        const alert = new Alert({
            target: alertBox,
            props: {
                alertType: alertType,
                alertMessage: alertMessage,
            },
        })

        alert.$on('closeAlert', () => {
            const index = alertQueue.indexOf(alert)
            if (index > -1) alertQueue.splice(index, 1)
            setTimeout(() => alert.$destroy(), 300)
        })

        alertQueue.push(alert)
    }
</script>

<div bind:this={alertBox} class="fixed right-0 top-0 z-50 max-h-screen w-full max-w-sm overflow-hidden p-4"></div>
