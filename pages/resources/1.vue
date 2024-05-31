<script setup>
const { query } = useRoute();

if (!query.lti) {
  console.error("Missing LTI token query parameter");
}

const { data } = await useFetch("/membership", {
  headers: {
    Authorization: `Bearer ${query.lti}`,
  },
});
</script>

<template>
  <div>
    <h1>Resource 1</h1>
    <p>This is the resource 1 page.</p>
    <div>{{ data?.members }}</div>
  </div>
</template>
