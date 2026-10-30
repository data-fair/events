<template>
  <v-container fluid>
    <p>
      Session :
    </p>
    <pre>{{ session.state }}</pre>
  </v-container>
</template>

<script setup lang="ts">
const session = useSession()
</script>
