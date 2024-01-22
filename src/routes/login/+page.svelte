<script lang="ts">
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";
    import { fade } from "svelte/transition";
    import { newestAlert } from "$lib/stores";
    import type { PageServerData } from "../$types";
    import type { SubmitFunction } from "@sveltejs/kit";

    export let data: PageServerData

    type FormMode = 'signIn' | 'newUser'
    let formMode: FormMode = 'signIn'

    const handleForm: SubmitFunction = ({ formData, cancel, action }) => {
        const actionType: string = action.search.substring(2)
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
            if (username.toString().length > 30) {
                cancel()
                return $newestAlert = ['caution', 'Username must be 30 characters or fewer']
            }
            if (password.toString().length < 8) {
                cancel()
                return $newestAlert = ['caution', 'Password must be at least 8 characters']
            }
            if (password !== confirmPassword) {
                cancel()
                return ($newestAlert = ['caution', 'Password and Confirm Password must match'])
            }
        }

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
        <form method="post" on:submit|preventDefault use:enhance={handleForm}>
            <section>
                <div class="p-4">
                    <input name="username" type="text" autocomplete="off" placeholder="Username" class="h-10 w-full border-b-2 border-lazuli-primary bg-transparent px-1 outline-none" />
                </div>
            </section>
        </form>
    </main>
</div>