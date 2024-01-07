<script>
    import { enhance } from '$app/forms'
    import { goto } from '$app/navigation'
    import { fade } from 'svelte/transition'
    import { newestAlert } from '$lib/stores/alertStore.js'

    export let data

    let formMode = 'signIn'

    const handleForm = ({ formData, cancel, action }) => {
        const actionType = action.search.substring(2)
        if (actionType !== formMode) {
            cancel()
            return (formMode = formMode === 'signIn' ? 'newUser' : 'signIn')
        }

        const { username, password, confirmPassword } = Object.fromEntries(formData)

        if (!username || !password || (formMode === 'newUser' && !confirmPassword)) {
            cancel()
            return ($newestAlert = ['caution', 'All fields must be filled out'])
        }

        if (formMode === 'newUser') {
            if (username.length > 50) {
                cancel()
                return ($newestAlert = ['caution', 'Really? You need a username longer that 50 characters? No, stop it, be normal'])
            }
            if (password.length < 8) {
                cancel()
                return ($newestAlert = ['caution', 'Password must be at least 8 characters long'])
            }
            if (password !== confirmPassword) {
                cancel()
                return ($newestAlert = ['caution', 'Password and Confirm Password must match'])
            }
        }

        if (data.redirectLocation) formData.append('redirectLocation', data.redirectLocation)

        return async ({ result }) => {
            if (result.type === 'redirect') {
                goto(result.location)
            } else if (result.type === 'failure') {
                return ($newestAlert = ['warning', result.data.message])
            }
        }
    }
</script>

<div class="flex h-full items-center justify-center">
    <div class="w-full max-w-4xl rounded-2xl p-8">
        <section class="flex h-14 justify-center">
            {#key formMode}
                <span class="absolute text-5xl" transition:fade={{ duration: 100 }}>{formMode === 'signIn' ? 'Sign In' : 'Create New User'}</span>
            {/key}
        </section>
        <form method="post" on:submit|preventDefault use:enhance={handleForm}>
            <section>
                <div class="p-4">
                    <input name="username" type="text" autocomplete="off" placeholder="Username" class="h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none" />
                </div>
                <div class="flex">
                    <div class="w-full p-4">
                        <input name="password" type="password" placeholder="Password" class="h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none" />
                    </div>
                    <div class="overflow-hidden py-4 transition-[width] duration-300 ease-linear" style="width: {formMode === 'newUser' ? '100%' : 0};" aria-hidden={formMode !== 'newUser'}>
                        <div class="px-4">
                            <input name="confirmPassword" type="password" placeholder="Confirm Password" class="block h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none" />
                        </div>
                    </div>
                </div>
            </section>
            <section class="mt-6 flex items-center justify-around">
                <button formaction="?/signIn" class="h-12 w-1/3 rounded-md transition-all active:scale-[97%]" style="background-color: {formMode === 'signIn' ? 'var(--lazuli-primary)' : '#262626'};">
                    Sign In
                    <i class="fa-solid fa-right-to-bracket ml-1" />
                </button>
                <button
                    formaction="?/newUser"
                    class="h-12 w-1/3 rounded-md transition-all active:scale-[97%]"
                    style="background-color: {formMode === 'newUser' ? 'var(--lazuli-primary)' : '#262626'};"
                >
                    Create New User
                    <i class="fa-solid fa-user-plus ml-1" />
                </button>
            </section>
        </form>
    </div>
</div>
