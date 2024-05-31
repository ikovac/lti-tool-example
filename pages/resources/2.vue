<script setup>
const { query } = useRoute();
const score = ref(0);

if (!query.lti) {
  console.error("Missing LTI token query parameter");
}

const submit = () => {
  return $fetch("/scores", {
    method: "POST",
    body: { resourceId: 2, score: score.value },
    headers: {
      Authorization: `Bearer ${query.lti}`,
    },
  });
};
</script>

<template>
  <div>
    <h1>Resource 2</h1>
    <p>This is the resource 2 page.</p>

    <div>
      <h2>Score selection</h2>
      <div>Select your score:</div>
      <URange :min="0" :max="100" v-model="score" />
      <div>Your score is: {{ score }}</div>
      <UButton @click="submit">Submit</UButton>
    </div>
  </div>
</template>
