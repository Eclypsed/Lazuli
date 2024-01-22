<script lang="ts">
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";
    import { fade } from "svelte/transition";
    import { newestAlert } from "$lib/stores";
    import type { PageServerData } from "../$types";
    import type { SubmitFunction } from "@sveltejs/kit";

    // export let data: PageServerData

    type FormMode = 'signIn' | 'newUser'
    let formMode: FormMode = 'signIn'

    let passwordInput: string, confirmPasswordInput: string
    let passwordsMatch: boolean = false
    $: passwordsMatch = (passwordInput === confirmPasswordInput)
    $: console.log(passwordsMatch)

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

        console.log("Passed all checks")
        cancel()
    }
</script>

<div class="grid h-full place-items-center">
    <main class="w-full max-w-4xl">
        <div class="flex h-14 justify-center">
            {#key formMode}
                <h1 class="absolute text-5xl" transition:fade={{ duration: 100 }}>{formMode === 'signIn' ? 'Sign In' : 'Create New User'}</h1>
            {/key}
        </div>
        <form method="post" use:enhance={handleForm}>
            <section>
                <div class="p-4">
                    <input name="username" type="text" autocomplete="off" placeholder="Username" class="h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none" />
                </div>
                <div class="flex">
                    <div class="w-full p-4">
                        <input bind:value={passwordInput} name="password" type="password" placeholder="Password" class="h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none" />
                    </div>
                    <div class="overflow-hidden py-4 transition-[width] duration-300" style="width: {formMode === 'newUser' ? '100%': 0};" aria-hidden={formMode !== 'newUser'}>
                        <div class="px-4">
                            <input bind:value={confirmPasswordInput} name="confirmPassword" type="password" placeholder="Confirm Password" class="h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none" tabindex="{formMode === 'newUser' ? 0 : -1}" />
                        </div>
                    </div>
                </div>
            </section>
            <section class="mt-6 flex items-center justify-around gap-2">
                <button formaction="?/signIn" class="h-12 w-1/3 rounded-md transition-all active:scale-[97%]" style="background-color: {formMode === 'signIn' ? 'var(--lazuli-primary)' : '#262626'};">
                    Sign In
                    <i class="fa-solid fa-right-to-bracket ml-1" />
                </button>
                <button formaction="?/newUser" class="h-12 w-1/3 rounded-md transition-all active:scale-[97%]" style="background-color: {formMode === 'newUser' ? 'var(--lazuli-primary)' : '#262626'};">
                    Create New User
                    <i class="fa-solid fa-user-plus ml-1" />
                </button>
            </section>
        </form>
    </main>
</div>