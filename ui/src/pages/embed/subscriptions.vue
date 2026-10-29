<script lang="ts" setup>
// a full page now, the embed URL stays valid for compatibility
definePage({ redirect: to => ({ path: '/subscriptions', query: to.query }) })
</script>
