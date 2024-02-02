<script lang="ts">
    import { enhance } from '$app/forms'
    import { goto } from '$app/navigation'
    import { fade } from 'svelte/transition'
    import { newestAlert } from '$lib/stores'
    import type { PageData } from './$types'
    import type { SubmitFunction } from '@sveltejs/kit'

    export let data: PageData

    type FormMode = 'signIn' | 'newUser'
    let formMode: FormMode = 'signIn'

    let passwordVisible: boolean = false

    const handleForm: SubmitFunction = ({ formData, cancel, action }) => {
        const actionType: string = action.search.substring(2)
        if (actionType !== formMode) {
            formMode = formMode === 'signIn' ? 'newUser' : 'signIn'
            return cancel()
        }

        const { username, password, confirmPassword } = Object.fromEntries(formData)

        if (!username || !password || (formMode === 'newUser' && !confirmPassword)) {
            $newestAlert = ['caution', 'All fields must be filled out']
            return cancel()
        }

        if (formMode === 'newUser') {
            if (username.toString().length > 30) {
                $newestAlert = ['caution', 'Username must be 30 characters or fewer']
                return cancel()
            }
            if (password.toString().length < 8) {
                $newestAlert = ['caution', 'Password must be at least 8 characters']
                return cancel()
            }
            if (password !== confirmPassword) {
                $newestAlert = ['caution', 'Password and Confirm Password must match']
                return cancel()
            }
        }

        if (data.redirectLocation) formData.append('redirectLocation', data.redirectLocation)

        return async ({ result }) => {
            if (result.type === 'failure') return ($newestAlert = ['warning', result.data?.message])
            if (result.type === 'redirect') return goto(result.location)
        }
    }
</script>

<div class="grid h-full place-items-center overflow-clip px-8">
    <main class="relative w-full max-w-3xl">
        <div class="flex h-14 justify-center">
            {#key formMode}
                <h1 class="absolute whitespace-nowrap text-5xl" transition:fade={{ duration: 100 }}>{formMode === 'signIn' ? 'Sign In' : 'Create New User'}</h1>
            {/key}
        </div>
        <form method="post" use:enhance={handleForm}>
            <section>
                <div class="p-4">
                    <input name="username" type="text" autocomplete="off" placeholder="Username" class="h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none" />
                </div>
                <div class="flex items-center gap-4 p-4">
                    <div class="w-full">
                        <input name="password" type={passwordVisible ? 'text' : 'password'} placeholder="Password" class="h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none" />
                    </div>
                    <div class="overflow-hidden transition-[width] duration-300" style="width: {formMode === 'newUser' ? '100%' : 0};" aria-hidden={formMode !== 'newUser'}>
                        <input
                            name="confirmPassword"
                            type={passwordVisible ? 'text' : 'password'}
                            placeholder="Confirm Password"
                            class="h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none"
                            tabindex={formMode === 'newUser' ? 0 : -1}
                        />
                    </div>
                    <button on:click|preventDefault={() => (passwordVisible = !passwordVisible)} class="aspect-square h-9 rounded-full bg-neutral-800 transition-transform duration-100 active:scale-90">
                        <i class="fa-solid {passwordVisible ? 'fa-eye' : 'fa-eye-slash'}" />
                    </button>
                </div>
            </section>
            <section class="mt-6 flex items-center justify-around gap-2">
                <button formaction="?/signIn" class="h-12 w-1/3 overflow-clip whitespace-nowrap rounded-md transition-all active:scale-[97%] {formMode === 'signIn' ? 'bg-lazuli-primary' : 'bg-neutral-800'}">
                    Sign In
                    <i class="fa-solid fa-right-to-bracket ml-1" />
                </button>
                <button formaction="?/newUser" class="h-12 w-1/3 overflow-clip whitespace-nowrap rounded-md transition-all active:scale-[97%] {formMode === 'newUser' ? 'bg-lazuli-primary' : 'bg-neutral-800'}">
                    Create New User
                    <i class="fa-solid fa-user-plus ml-1" />
                </button>
            </section>
        </form>
    </main>
</div>
