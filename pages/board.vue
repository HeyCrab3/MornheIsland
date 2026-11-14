<template>
  <ClientOnly>
    <div
      class="board-root"
      :class="[`theme-${settings.theme}`, `shadow-${settings.textShadow}`]"
      :style="rootStyle"
    >
      <!-- 背景遮罩，保证任何背景上文字都可读 -->
      <div class="board-veil" />

      <!-- 时钟 -->
      <div
        v-if="settings.showClock"
        class="el-block"
        :class="{ 'is-editing': editMode }"
        :style="posStyle('clock')"
        @pointerdown="onPointerDown('clock', $event)"
      >
        <div class="clock-time">
          {{ clockText
          }}<span v-if="settings.showSeconds" class="clock-sec">{{
            secondsText
          }}</span>
        </div>
        <div class="clock-date">{{ dateText }}</div>
      </div>

      <!-- 当前科目 -->
      <div
        v-if="settings.showSubject"
        class="el-block"
        :class="{ 'is-editing': editMode }"
        :style="posStyle('subject')"
        @pointerdown="onPointerDown('subject', $event)"
      >
        <template v-if="identity">
          <template v-if="currentEntry">
            <div class="subject-label">
              <span v-if="currentEntry.isExam" class="exam-chip">考试</span>
              {{
                currentEntry.isExam
                  ? "考试中"
                  : currentEntry.type === "class"
                    ? "正在上"
                    : "当前"
              }}
            </div>
            <div class="subject-name">{{ currentMain }}</div>
            <div class="subject-sub">
              <span v-if="currentEntry.isExam"
                >{{ currentEntry.start }}–{{ currentEntry.end }}</span
              >
              <span v-else-if="currentEntry.name">{{ currentEntry.name }}</span>
              <span v-if="currentEntry.teacher"
                >· {{ currentEntry.teacher }}</span
              >
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: progress * 100 + '%' }"
              />
            </div>
            <div class="subject-sub">还剩 {{ remainMinutes }} 分钟</div>
          </template>
          <template v-else>
            <div class="subject-label">
              <span v-if="nextEntry?.isExam" class="exam-chip">考试</span>
              {{ nextEntry ? "下一节" : "今天" }}
            </div>
            <div class="subject-name">
              {{ nextEntry ? nextMain : "今天没有课了" }}
            </div>
            <div v-if="nextEntry" class="subject-sub">
              {{ nextEntry.start }}–{{ nextEntry.end }}
              <span v-if="nextEntry.name && !nextEntry.isExam">
                · {{ nextEntry.name }}</span
              >
            </div>
          </template>
        </template>
        <div v-else class="subject-label">未设置班级</div>
      </div>

      <!-- 天气 -->
      <div
        v-if="settings.showWeather"
        class="el-block"
        :class="{ 'is-editing': editMode }"
        :style="posStyle('weather')"
        @pointerdown="onPointerDown('weather', $event)"
      >
        <template v-if="weather">
          <div v-if="settings.weatherLocationName" class="weather-city">
            {{ settings.weatherLocationName }}
          </div>
          <div class="weather-row">
            <span class="weather-emoji">{{
              weatherEmoji(weather.now.icon)
            }}</span>
            <span class="weather-temp">{{ weather.now.temp }}°</span>
          </div>
          <div class="weather-text">{{ weather.now.text }}</div>
          <div v-if="weather.today" class="weather-sub">
            {{ weather.today.textDay }} {{ weather.today.tempMin }}° ~
            {{ weather.today.tempMax }}°
          </div>
          <div v-if="weather.now.windDir" class="weather-sub">
            {{ weather.now.windDir }} {{ weather.now.windScale }} 级
          </div>
          <div class="weather-credit">
            <a
              href="https://www.qweather.com/"
              target="_blank"
              rel="noopener noreferrer"
              >和风天气</a
            >
          </div>
        </template>
        <div v-else class="subject-label">天气加载中…</div>
      </div>

      <!-- 公告板 -->
      <div
        v-if="settings.showNotice"
        class="el-block notice-block"
        :class="{ 'is-editing': editMode }"
        :style="posStyle('notice')"
        @pointerdown="onPointerDown('notice', $event)"
      >
        <!-- 安全性：renderMarkdownLite 先整体转义 HTML 再套 Markdown 语法，
             原始 HTML 不会被执行，所以这里的 v-html 是可控的。 -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="md-body" v-html="noticeHtml" />
      </div>

      <!-- 气象预警：磨砂玻璃悬浮条，滚动内容包含标题与详细正文 -->
      <div v-if="warningItems.length" class="warning-bar">
        <div class="warning-glass">
          <div class="warning-viewport">
            <div
              class="warning-track"
              :style="{ animationDuration: warningScrollSeconds + 's' }"
            >
              <span v-for="(w, i) in warningLoop" :key="i" class="warning-item">
                <span
                  class="warning-tag"
                  :class="warningLevelClass(w.severityColor)"
                >
                  {{ w.level || w.typeName || "预警" }}
                </span>
                <span class="warning-title">{{ w.title }}</span>
                <span v-if="w.text" class="warning-detail">{{ w.text }}</span>
                <span v-if="w.sender" class="warning-src"
                  >— {{ w.sender }}</span
                >
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 水印 -->
      <el-popover placement="top-end" width="256px">
        <img class="w-36 mx-auto mb-4" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAYAAACAvzbMAAAQAElEQVR4Aezd63bcNrIGUH3n/d85x7SjOJ5IKHQDBG97VmjJDbAuGz2r/pDL//eX/xEgQIAAgTcE/u/D/wgQIECAwBsCBsgbaG4hMEVAEAIXFzBALn6AyidAgMBRAgbIUfLyEiBA4OICFx4gF5dXPgECBC4uYIBc/ACVT4AAgaMEDJCj5OUlcGEBpRPYBAyQTcFFgAABAi8LGCAvk7mBAAECBDYBA2RTWH3JR4AAgRsIGCA3OEQtECBA4AgBA+QIdTkJEDhKQN6JAgbIREyhCBAg8CQBA+RJp61XAgQITBQwQCZiPiGUHgkQIPApYIB8SvhJgAABAi8JGCAvcdlMgACBowTOl9cAOd+ZqIgAAQKXEDBALnFMiiRAgMD5BAyQ852JivYREJUAgckCBshkUOEIECDwFAED5CknrU8CBAhMFugeIJPzCkeAAAECFxcwQC5+gMonQIDAUQIGyFHy8hLoFrCRwDkFlg2QJB/Jc64Vx53UnjPqSOo8SXtPVUfSvj9JFWLZ96sqJElZSxWjZz1p5+mJUe1J2jmS86zfqZdk3LXymLG+bIDMKFYMAgQIEDiPwBMGyHm0VUKAAIEbCRggNzpMrRAgQGClgAGyUlsuAk8T0O+tBQyQWx+v5ggQILCfgAGyn63IBAgQuLWAAXLq41UcAQIEzitggJz3bFRGgACBUwucaoD89ddfH1e4Vp1o0n6ZaEYdSTtHkvJMZtSxKsaM79eqWkfzJPXZJu09ozX03l+dS2+c0X3/ruPMv4/2Oev+Uw2QWU2JQ4AAAQL7Cxgg+xvLQIAAgVsKGCC3PNYTNKUEAgRuL2CA3P6INUiAAIF9BAyQfVxFJUCAwFECy/IaIMuoJSJAgMC9BAyQe52nbggQILBM4FIDJGk/s57MWV+hn9S1VnX0PKdexZixPqOOs8TYPEavGb301NCTp9pT5anun7Ve1XGW9aT+/20yvucs/VZ1XGqAVM1YJ0CAAIF1AgbIOmuZCBAgcCuB+QPkVjyaIUCAAIHvBAyQ72R8ToAAAQJNAQOkyWORwKUEFEtgqYABspRbMgIECNxHwAC5z1nqhAABAksFDJB/cfuVAAECBPoFDJB+q+U7q5e0ZhRU5djWk/EXo5J2jBm9JO0cSWak+UhyimtGM9v5tq5kvNeeOpN2np4Y9qwXMEDWm8tIgMB/BHxwRQED5IqnpmYCBAicQMAAOcEhKIEAAQJXFDBArnhq/63ZJwQIEFguYIAsJ5eQAAEC9xAwQO5xjrogQOAogQfnNUAefPhaJ0CAwIiAATKid/C9SfvZ+SRlhUnKdxrKIB0bWu8abGsdIco6tzjVlbT77amjytGzXuWZEaPKsWo9aZsnWVWKPJMFDJDJoMK9KmA/AQJXFTBArnpy6iZAgMDBAgbIwQcgPQECBI4SGM1rgIwKup8AAQIPFTBAHnrw2iZAgMCogAEyKuj+5wronMDDBQyQh38BtE+AAIF3BQyQd+XcR4AAgYcLHDhAXpfveblqxp7XKzvmjp5eq8pmxKhy9KwnGX5RMBmP0VNrtSe5Th1Ju9aq12295zs0umfLc4ZrtI/e+8/Qa08NlxogPQ3ZQ4AAAQJrBAyQNc6yEDiVgGIIzBAwQGYoikGAAIEHChggDzx0LRMgQGCGgAHyjqJ7CBAgQODDAPElIECAAIG3BAyQt9jcRIDAQQLSnkjgVAMkaT+Tnpxj/Sznl9QeVa1JHaN6dr3KcaX1pPZY0U+ypo4VZ5us6WXGuSR1rcnxe2b0OiPGqQbIjIbEIECAAIE1AgbIGufTZFEIAQIEZgkYILMkxSFAgMDDBAyQhx24dgkQOErgfnkNkPudqY4IECCwRMAAWcIsCQECBO4nYIDc70zv2pG+CBA4mYABcrIDUQ4BAgSuIrBsgFQvLN1tfcYXIGm/sDQjR497co46qn57eqli9KwnbY8ZdcyI0dPLij1n6aWnjjvtmXq23wRbNkC+ye9jAgQIELiogAFy0YNTNgECBI4WMECOPgH5HyCgRQL3FDBA7nmuuiJAgMDuAgbI7sQSECBA4J4CVxgg95TXFQECBC4uYIBc/ACVT4AAgaMElg2QpP3sfJLSIMlHco2raqbnefMqRs960vbqiVHV2hMjadeRjK/31DFjT+WRjPeSjMeY0utff32M9ruqjipPMm6arIlR9XKW9WUD5CwNq4MAAQIE5ggYIHMcRSFAgMDjBAyQXY9ccAIECNxXwAC579nqjAABArsKGCC78gpOgMBRAvLuL2CA7G8sAwECBG4pYIDc8lg1RYAAgf0FDJD9ja+ZQdUECBAoBJYNkOplpG09ab+kU/Tyc3mL07p+bhr8oxX/c20wRdftn7laP6tASds8qddb+T/Xqjo+9438TOpak/aeqs5tPWnH6Olhi9O6emLM2NOqYVtL2r0mGX7RMKlzJON7tn5WXNW5zKghqT1m5KliLBsgVSHWCRAgQOCnwGX+MEAuc1QKJUCAwLkEDJBznYdqCBAgcBkBA+QyR6XQXgH7CBBYI2CArHGWhQABArcTMEBud6QaIkCAwBqB/w6QNXllIUCAAIGLCywbIEn93HL1/HTPetLO03NeVZ6knSNJT5pyz4o6qhw962UjHRuSDP9jYT21Vns6Si3fe1gVo8qTrDGt6qjMe9arHD3rPXmqPT15qj1Vjm09aZ/dtqe6qjpmrC8bIDOKFYPAzQW0R+BSAgbIpY5LsQQIEDiPgAFynrNQCQECBC4lcKsBcil5xRIgQODiAgbIxQ9Q+QQIEDhKwAA5Sl5eArcS0MwTBQyQJ566ngkQIDBBwACZgCgEAQIEnihwqgGStF+eSer1FS/XVDm29Re/TF9uT9r9bnlGr6SdI8mXtR3xYdVrkvJlxBl1J+08K3IkmZFmSYwk5bkk7T1LCv2RJBmvIxmP8aOU5n9JO0eS5v2zFk81QGY1JQ4BAgQI7C9ggOxvLAMBAmcWUNvbAgbI23RuJECAwLMFDJBnn7/uCRAg8LaAAfI2nRt/CfiTAIGnChggTz15fRMgQGBQwAAZBHQ7AQIEjhI4Ou+pBkj1nH/PegXaEyPJ8HPryXiMqtaq1209adex7amupB0jqderHD3rSTtP5bWtV3m2PaNX0q4zSVVG+Y9WbTUmaX5PyyQ/NmxxWtePLeV/SbuOVvzPtSrJ576Rn1WOnvWe/FWcpO2VpDz/Kseq9VMNkFVNy0OAAAEC4wIGyLihCFcVUDcBAkMCBsgQn5sJECDwXAED5Llnr3MCBAgMCQwMkKG8biZAgACBiwsYIBc/QOUTIEDgKAED5Ch5eQkMCLiVwBkEDJAznIIaCBAgcEGB2w2QpH5JJ2nvqc5xxstEVY6e9aTdR5KeMOWenn6rPWWSjg0rciRpvpyXpKy0qnNbr4IkGa6jytGzntR1bP20rqSOUdWS1DGS8T0z6mhZ9K5VdfTEqWLMWL/dAOlCsYkAAQIEhgUMkGFCAQgQIPBMAQPkmeeuawJHCch7IwED5EaHqRUCBAisFDBAVmrLRYAAgRsJGCAXO0zlEiBA4CwCBshZTkIdBAgQuJjApQZIUj/nXfnPeH46OUcdVa+z1pO636S9p3KfUWvSriGp16s6t/Wq1qTOU8XY8oxeVY5tPWnXuu2prmQ8RtVrVUPPepVjW2/HmbOatL2SzEm0IMqlBsgCDykIECBAoFPAAOmEso0AAQIE/hQwQP708Lf9BEQmQOBmAgbIzQ5UOwQIEFglYICskpaHAAECRwnslNcA2QlWWAIECNxdwAC5+wnrjwABAjsJGCA7wQp7JwG9ECDwlcCpBkiS5j+is73oU11fNTn7s6qGnvWempJxj6qWnjqqPVWObb2KMWN9y1NdVZ6kbZ7U61WOnvVkTZ6qlspz1nrS7reqc1uvaknaOZJ8VDF61rdaWteMGK34K9dONUBWNi4XAQIECIwJrBggYxW6mwABAgROKWCAnPJYFEWAAIHzCxgg5z8jFRJ4X8CdBHYUMEB2xBWaAAECdxYwQO58unojQIDAjgIGSBPXIgECBAh8J3CqAVI9H/1dE6s/T+rnyZP2np6aK4+knSOp13vqWLGn6nVbT9r9rKhzy7HV0rq2PSuupO3RqvFzbUadSbuOnhyf9Xz3sydG0q7ju9j//jxpx+ipo9qTtHMkqUI035dL8nO9DDJhw6kGyIR+hCBA4CYC2ji/gAFy/jNSIQECBE4pYICc8lgURYAAgfMLGCDnP6P3KnQXAQIEdhYwQHYGFp4AAQJ3FTBA7nqy+iJA4CiBx+Q1QB5z1BolQIDAXAEDZK6naAQIEHiMwLIB8u+Xdb77Pfn1Akzy/s/vYn9+PuNkP2O1fs7Ik7QdWvlnrq3o5d853v09aXsleTf0H/cl+fmiVvL1zx775Ot7k1+f98T4o6g3/1LlSX7Vk3z/c0aM5Pv4yZx/6Clp50hSKiZpnn1Sr5dJfmxI2nF+bDnFf8sGyCm6VQQBAgQITBMwQKZRCkSAAIGrC7xWvwHympfdBAgQIPC3gAHyN4QfBAgQIPCagAHympfdBFoC1gg8SsAAedRxa5YAAQLzBAyQeZYiESBA4FECpxoglXz1vPm2nrSfn07q9aqOZDxGlWNb3/ppXUldRzK+p1XDtpbUObZ+9r62WkavvWv8jF/VmYybJnWMpL3ns969f87wSMZ7qerY2+EzflVHz/pnrD1/XmqA7AkhNgECBAi8JmCAvOZlN4GbCmiLwOsCBsjrZu4gQIAAgR8CBsgPBP8RIECAwOsCBsjrZl/d4TMCBAg8TsAAedyRa5gAAQJzBAyQOY6iECBwlIC8hwkYIIfRS0yAAIFrC5xqgFQvx/RQVzHOsp60X3pKUrY7o5cySceGs9SRpPzHfjraGd6SjNfRY1oV2hOj2lPl6FmvcmzrPXHusmfrt7qu0uupBshV0O5Vp24IECDwnoAB8p6buwgQIPB4AQPk8V8BAAQIHCVw9bwGyNVPUP0ECBA4SMAAOQheWgIECFxdwAC5+gk+uX69EyBwqIABcii/5AQIELiuwLIBkow/G9/DnLTzzIiRtHMk9Xr1HPi2XtWa1HmS9p4tT3WtqCNp15nko6qzZz1p5+mJUXnMiFHl2NarPEm71yRbmOZV5djWkzTfv2km+HsxGY/xd6hvf2y1VlfSrqO6v2c9aedI6vVvm1y38DPTsgHyM5s/CBAgQOA2AgbIbY5SIwQIEFgrYICs9ZaNwE8BfxC4g4ABcodT1AMBAgQOEDBADkCXkgABAncQuOYAuYO8HggQIHBxAQPk4geofAIECBwlYIAcJS8vgWsKqJrAPwKnGiBJ/QJN0t7zT2cDv/S8DFTtqdIn7T6Ser2qoWe9qrNnfVWeqpakNjtLjKSuNRnbM+NckrqGFaZVjp71ZE0vSTtPT63VnqSdI0kVYsr6qQbIlI4EIUCAAIElAgbIEubfSfxGgACBuwgYIHc5SX0QIEBgsYABshhcOgIEsHiBcgAADpFJREFUjhKQd7aAATJbVDwCBAg8RMAAechBa5MAAQKzBQyQ2aL3jaczAgQI/CGwbIDMeCb9j8q/+UuVJ0nzH79J5qxXdcxY/4bgj4+TOf0k38f5I+GOf0m+ryFJV+ZV7lUxM+qoYlQ1bOtJmv9/2PaMXlWdPeujNZzp/p5+Z+xZ0fOyAbKiGTkIECBwS4GTNmWAnPRglEWAAIGzCxggZz8h9REgQOCkAgbISQ9GWTMFxCJAYA8BA2QPVTEJECDwAAED5AGHrEUCBAjsIdAzQPbIKyYBAgQIXFzAALn4ASqfAAECRwk8boDMeEGnJ8aKA03aL4ElmVJG1W+S5stoST6qGD2FVjF61pN2rT11VHt66qhi/LM+8EvS7jWpz6Wnl2pPTwtJu9aeGFUdM9Z76pixJ2l7JPX6jDqqGI8bIBWIdQIECBDoEzBA+pzsIkCAAIH/Ebj5APmfbv2VAAECBKYJGCDTKAUiQIDAswQMkGedt24JLBOQ6P4CBsj9z1iHBAgQ2EXAANmFVVACBAjcX+BUA2TFc9rJ+PPTSR0jGdzTcX/P17My7YmxYk9V57aetE176tzitK5VMao8SbvXpF6vcmzrSTvOtqe6kvEYVY7WmX2uVTFmrH/mGvmZtL2S+v2cGb3MiHGqATKjITEIECBAYI2AAbLGWRYCBK4joNJOAQOkE8o2AgQIEPhTwAD508PfCBAgQKBTwADphLKtX8BOAgSeIWCAPOOcdUmAAIHpAgbIdFIBCRAgcJTA2rwGyFpv2QgQIHAbgdsNkKT9kk7PC0DJeIyePKN7er6FSbuXnhgr9iTtOpM5L1cldZ6kvWeGR9LOMfrd2O7vqXPb17qSdp1JetKcYk+S8h8+S/bf0/L+XEvadZwC9EcRtxsgP3ryH4F3BdxHgMALAgbIC1i2EiBAgMBvAQPkt4XfCBAgQOAFgakD5IW8thIgQIDAxQUMkIsfoPIJECBwlIABcpS8vASmCghGYL2AAbLeXEYCBAjcQuBUAyS5xrPPSbvOJOWXI0n5THoV5POZ8b1/VnX0rCftfntizNgzw6qqI2n3mtTvtCR1jKS9p6fXZDxGlafy2tarGEm7zqRe3/KsuKpeemqoYvSs9+QZ3XOqATLazMD9biVAgACBFwUMkBfBbCdAgACBXwIGyC8HfxIgcJSAvJcVMEAue3QKJ0CAwLECBsix/rITIEDgsgIGyGWP7rNwPwkQIHCMgAFyjLusBAgQuLyAAXL5I9QAAQJHCTw977IBkqx50ad6wSap66hi9KxXX6yeGElda9LeU9UxY72nl2rPjDpWxUj2N6+8etZ7PKo4SbvXJD1pyj1Jmi/WlgF+bKh66Vn/EWb4v2S8l6qIpJ0jSRViyvqyATKlWkEIECBA4DQCBshpjuKBhWiZAIFLCxgglz4+xRMgQOA4AQPkOHuZCRAgcJTAlLwGyBRGQQgQIPA8AQPkeWeuYwIECEwRMECmMAryNAH9EiDw8XGqAVI9p52k+ax4kilnmqTMk+y/p2qm8trWk3adVY5tPdk/xlZrdSX715G0cyT1Pwa1mVVXUudJ9t9T1VmdybZexZixvuWprhl5qhhVDdt6FSOpz7WKseWprirGjPVTDZAZDYlBgAABAmsEjhkga3qThQABAgR2FDBAdsQVmgABAncWMEDufLp6I/BfAZ8QmCZggEyjFIgAAQLPEjBAnnXeuiVAgMA0AQPkRUrbCRAgQOCXgAHyy8GfBAgQIPCiwKUGSPXizLb+Yv9vbd/yrLiq4pLxF5KqHD3ryXgdyXiMnlpnnFvSrnVGjlUxKrOk3WtSr1c5etaTLc/+V1VLUtdQxehZT+o8SXtPT57RPZcaIKPNup8AAQIE5gkYIPMsRSJAgMCjBAyQ5xy3TgkQIDBVwACZyikYAQIEniNggDznrHVKgMBRAjfNa4Dc9GC1RYAAgb0FDJC9hcUnQIDATQUuNUCS9nPPSaYcU/UMfpLhf3Cqp9CqjhnrSd1LlWdGL+0Yv1arOpK6l1+Rvv8zqWNUdXwf/fdKUudJjt9T9dqz/rvr73/riVPt+T56/8qMHCtiVDm29f6u3995qQHyfpvuJECAAIHZAgbIbFHxCBAgcCOBVisGSEvHGgECBAh8K2CAfEtjgQABAgRaAgZIS8cagVEB9xO4sYABcuPD1RoBAgT2FDBA9tQVmwABAjcWOPkAubG81ggQIHBxgUsNkO3lmOqqzqO6f1tP2i9wbXtGr6rObT1p17Htqa6kHaOnjypHT4zkHHWs6CVp95qkKuOjx3TFnrLQjg1Jhl+8TeoYHaUMb+kxT9q1zogx3MikAJcaIJN6FoYAgQ4BWwhUAgZIJWSdAAECBL4UMEC+ZPEhAQIECFQCBkgl9O66+wgQIHBzAQPk5gesPQIECOwlYIDsJSsuAQJHCci7SMAAWQQtDQECBO4mYIB8caLVc9pJ+znvZM76jDpmxEjG+6nq+OIY/vNR0q7jPzfs9MGMXmaUlrQ9knOsV17b+gyPGTGScbOqjqTOsZm0rirHqnUDZJX0hfIolQABAj0CBkiPkj0ECBAg8B8BA+Q/JD4gQIDAUQLXymuAXOu8VEuAAIHTCBggpzkKhRAgQOBaAgbItc5LtW0BqwQILBQwQBZiS0WAAIE7CRggdzpNvRAgQGChwB8DZM+8rZdiPtf2zD8z9me9Iz976knaLxz1xKj29PQwI0bS7iWp16takzpGMr5nhkcVo2e98uiJsWJPUpvP6KWKMWN9hdeWI6nNkvaeLc7e17IBsncj4hMgQIDAWgEDZK23bAS+EfAxgesJGCDXOzMVEyBA4BQCBsgpjkERBAgQuJ7AXQbI9eRVTIAAgYsLGCAXP0DlEyBA4CgBA+QoeXkJ3EVAH48VWDZAkvYzy8m91qtv1Ixn0ntiVHUktfuKGDN6qerc1qs8257RK6lNV9RR5djWR3vtuX/LU11J26wnT7UnaedIUoWYsl5ZzFqfUmwRZNkAKeqwTIAAAQIXEzBADj8wBRAgQOCaAgbINc9N1QQIEDhcwAA5/AgUQIDAUQLyjgkYIGN+7iZAgMBjBQyQxx69xgkQIDAmYICM+T37bt0TIPBoAQPk0ceveQIECLwvcKoBMusFmr3jvM/9+84kH0n7+r37/d+Sdo4ZVj3VVXl6YlR7qhzb+lViVHX2rCfts09ShtnMRq8kS77rVTM9fVQxVq0npdkpTE81QFYdjjwECBAgMC5ggIwbikCAAIFHChggjzx2TRMgQGBcwAAZNxSBAAECjxQwQB557JomQIDAuMB7A2Q8rwgECBAgcHEBA+TiB6h8AgQIHCVwqQGSjD8bndQxjjqMPfJWz7735EzaZlWObb0nz+iepF1nkjJFkvL5+mR8T1VI8m2Of+qrYmzuo1dS15G094zWsN1f9bqtJ+06kvH1LU91bfW2rqSuYzTHlr+KMWP9UgNkRsNiECBAgMAcAQNkjqMoBAgQeJzA4wbI405YwwQIENhJwADZCVZYAgQI3F3AALn7CeuPwGkEFHI3AQPkbieqHwIECCwSMEAWQUtDgACBuwkYINc5UZUSIEDgVAIGyKmO489ikvYLR3/u/vpvyXiMryO/9mnSriMZX99enqqupJ2np6sqR8960q6jJ0ZVa9LOkaQK0bVe1Zrkn5cfk/d+r3Js61Wx257qmhEjafdY1dCzXtW5at0AWSUtDwEC1xVQ+ZcCBsiXLD4kQIAAgUrAAKmErBMgQIDAlwIGyJcsPpwrIBoBAncUMEDueKp6IkCAwAIBA2QBshQECBA4SmDPvAbInrpiEyBA4MYCBsiFDzdpP2+e5KN6pnxV+1UdPeszaq3yzMiRrDmXpJ2n6nVbT9oxejyS8Rg9eUb3JO06k5QpkpTvtGyuratMcqENBsiFDkupBwhISYDAtwIGyLc0FggQIECgJWCAtHSsESBAgMC3AjsPkG/zWiBAgACBiwsYIBc/QOUTIEDgKAED5Ch5eQnsLCA8gb0FDJC9hcUnQIDATQUMkJserLYIECCwt8ClBkjr5ZyZaz/Rd/6jp94ZJSTtF59m5JgRI2nXmaRMk6R8yasK0nMuSTvPjBhJO0dSvySajMeovLb1qt9tz+iVXKeXpF1rj0UyHqMnz+ieSw2Q0WbdT4AAAQLzBAyQeZYiESAwR0CUiwgYIBc5KGUSIEDgbAIGyNlORD0ECBC4iIABcpGDeqVMewkQILBCwABZoSwHAQIEbihggNzwULVEgMBRAs/Ke6oBkrSffU7OsT7jK5LUvVR5qufve9arHLPWk3a/PXmqfnpizNhT1ZG0e03qdzh66kzaeXpiVHuqXrf1pF3HtmfFVfXSs560e+mJUfWatHMkc74fPbWO7jnVABltxv0ECBAgsE7AAFlnLVMtYAcBAhcSMEAudFhKJUCAwJkEDJAznYZaCBAgcJTAG3kNkDfQ3EKAAAECHx8GiG8BAQIECLwlYIC8xeYmAv8r4O8EnidggDzvzHVMgACBKQLLBkj1cs3d1qvTmdFvlWPWelVrT54qRs96lWdGjCpHz/qMOnpizNjT00+1p6qjun/VelXnrPWqn548VYyzrC8bIEXDlgkQIEDgYgIGyMUOTLkECBA4i4ABcpaTUAeBowTkJfCmgAHyJpzbCBAg8HQBA+Tp3wD9EyBA4E0BA+RNuN+3+Y0AAQLPFDBAnnnuuiZAgMCwgAEyTCgAAQJHCch7rIABcqy/7AQIELisgAFy2aNTOAECBI4VMECO9T82u+wECBAYEDBABvDcSoAAgScLGCBPPn29EyBwlMAt8hogtzhGTRAgQGC9gAGy3lxGAgQI3ELAALnFMT6vCR0TIHC8gAFy/BmogAABApcUMEAueWyKJkCAwFECv/MaIL8t/EaAAAECLwgYIC9g2UqAAAECvwUMkN8WfiOwQkAOArcRMEBuc5QaIUCAwFoBA2Stt2wECBC4jcDlBsht5DVCgACBiwv8PwAAAP//ban3ZQAAAAZJREFUAwDM5jneSHnkqwAAAABJRU5ErkJggg=="/>
        <p class="text-center">想让自己的班级也用上大屏看板？<br/>扫描二维码立即试用莫宁岛！</p>
        <template #reference>
          <a
            class="board-watermark"
            :href="consoleUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            由莫宁岛驱动
          </a>
        </template>
      </el-popover>

      <!-- 底部操作提示 -->
      <div v-if="settings.showHints" class="board-hints">
        按 <kbd>E</kbd> 调整元素位置 · 拖动元素即可移动 · 左下角「设置」可换背景
        / 写公告 / 选班级
      </div>

      <!-- 设置入口 -->
      <button
        class="board-gear"
        title="打开看板设置（快捷键 E 切换布局编辑）"
        @click="drawer = true"
      >
        <span class="gear-icon">⚙</span>
        <span>设置</span>
      </button>
      <div v-if="editMode" class="board-edithint">
        布局编辑中：拖动元素调整位置，再按 E 退出
      </div>
    </div>

    <!-- 设置抽屉 -->
    <el-drawer
      v-model="drawer"
      title="看板设置"
      size="380px"
      :append-to-body="true"
    >
      <el-form label-position="top" size="small">
        <el-form-item label="班级">
          <el-select
            v-if="classList.length"
            v-model="settings.identity"
            clearable
            filterable
            placeholder="从我的班级里选"
            class="w-full mb-2"
            @change="onPickClass"
          >
            <el-option
              v-for="c in classList"
              :key="c._id"
              :label="`${c.name || '未命名'}${c.identity ? ' · ' + c.identity : ''}`"
              :value="String(c._id)"
            />
          </el-select>
          <el-input
            v-model="settings.identity"
            placeholder="班级 ID（或班级标识，如 1-101）"
            clearable
          />
          <div class="hint">
            <template v-if="classLoadState === 'anon'">
              未登录，拉不到班级列表。可以先
              <a href="/login" target="_blank">登录控制台</a>
              再回到看板（就能直接选班级），或者手动填班级
              ID——班级管理里点「管理」，地址栏最后一段就是。
            </template>
            <template v-else-if="classLoadState === 'loading'"
              >正在读取你的班级列表…</template
            >
            <template v-else-if="classLoadState === 'ok' && !classList.length">
              你还没有创建班级。可手动填班级 ID，或先去
              <a href="/classes" target="_blank">班级管理</a> 建一个。
            </template>
            <template v-else>
              填班级 <b>ID</b> 最准；也兼容班级标识。URL 参数可用
              <code>?id=</code> 覆盖。
            </template>
          </div>
        </el-form-item>

        <el-form-item label="天气位置">
          <div class="flex gap-2 w-full">
            <el-input
              v-model="cityQuery"
              placeholder="输入城市名，如 济南"
              clearable
              @keyup.enter="searchCity"
            />
            <el-button size="small" :loading="citySearching" @click="searchCity"
              >搜索</el-button
            >
          </div>
          <div v-if="cityResults.length" class="w-full mt-2">
            <el-radio-group
              v-model="settings.weatherLocation"
              class="city-list"
            >
              <el-radio v-for="c in cityResults" :key="c.id" :value="c.id">
                {{ c.name }}
                <span class="text-gray-400">
                  · {{ c.adm1
                  }}{{ c.adm2 && c.adm2 !== c.name ? " " + c.adm2 : "" }} ·
                  {{ c.id }}
                </span>
              </el-radio>
            </el-radio-group>
          </div>
          <div class="hint">
            当前：<b>{{
              settings.weatherLocationName || "跟随服务端默认城市"
            }}</b>
            <span v-if="settings.weatherLocation"
              >（{{ settings.weatherLocation }}）</span
            >
            <el-button
              v-if="settings.weatherLocation"
              size="small"
              text
              type="primary"
              @click="clearCity"
              >恢复默认</el-button
            >
          </div>
        </el-form-item>

        <el-form-item label="开学日期（用于单双周判定）">
          <el-date-picker
            v-model="settings.termStart"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择开学日期，可留空"
            clearable
            class="!w-full"
          />
          <div class="hint">
            留空时单双周不做区分，按每周都上处理。
            <template v-if="currentWeek"
              >按此日期算，今天属于第 {{ currentWeek }} 周。</template
            >
            <template v-else-if="settings.termStart"
              >日期在未来，暂不参与计算。</template
            >
          </div>
        </el-form-item>

        <el-form-item label="考试安排">
          <div class="w-full">
            <div class="text-sm">
              已在账号里安排
              <b>{{ serverExams.length }}</b>
              场考试，今天 <b>{{ todayExams.length }}</b> 场。
            </div>
            <el-button size="small" class="mt-2" @click="openExamsPage"
              >去控制台编辑</el-button
            >
          </div>
          <div class="hint">
            考试安排现在按<b>账号</b>存在服务端，该账号下所有班级共用一份，
            所以不用在这台机器上重复配置。规则：<b>与考试时间重合的标准课时用考试替代</b>，不重合的课时照常。
          </div>
        </el-form-item>

        <el-form-item label="显示项">
          <div class="flex flex-wrap gap-3">
            <el-checkbox v-model="settings.showClock">时间</el-checkbox>
            <el-checkbox v-model="settings.showSubject">科目</el-checkbox>
            <el-checkbox v-model="settings.showWeather">天气</el-checkbox>
            <el-checkbox v-model="settings.showNotice">公告</el-checkbox>
            <el-checkbox v-model="settings.showSeconds">显示秒</el-checkbox>
            <el-checkbox v-model="settings.showHints">显示操作提示</el-checkbox>
          </div>
        </el-form-item>

        <el-form-item label="配色">
          <el-radio-group v-model="settings.theme">
            <el-radio-button value="dark">深色文字</el-radio-button>
            <el-radio-button value="light">浅色文字</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="文字阴影">
          <el-radio-group v-model="settings.textShadow">
            <el-radio-button value="auto">跟随配色</el-radio-button>
            <el-radio-button value="dark">深色</el-radio-button>
            <el-radio-button value="light">浅色</el-radio-button>
            <el-radio-button value="none">无</el-radio-button>
          </el-radio-group>
          <div class="hint">
            跟随配色 = 浅色文字配深色阴影、深色文字配浅色阴影。
            深色文字模式下背景遮罩会自动换成浅色，否则深色字在暗背景上怎么加阴影都不清楚。
          </div>
        </el-form-item>

        <el-form-item :label="`整体缩放 ${settings.scale}%`">
          <el-slider v-model="settings.scale" :min="60" :max="200" :step="5" />
        </el-form-item>

        <el-form-item :label="`预警滚动速度 ${settings.warningSpeed} 字/秒`">
          <el-slider
            v-model="settings.warningSpeed"
            :min="2"
            :max="12"
            :step="1"
          />
          <div class="hint">
            数值越小越慢、越好读。鼠标移到预警条上会暂停。
            <template v-if="warningTotalChars">
              当前预警共 {{ warningTotalChars }} 字，滚完一轮约
              {{ warningScrollSeconds }} 秒。
            </template>
            <template v-else>（当前没有生效中的预警）</template>
          </div>
        </el-form-item>

        <el-form-item label="背景">
          <el-radio-group v-model="settings.bgType" class="mb-2">
            <el-radio-button value="gradient">渐变</el-radio-button>
            <el-radio-button value="image">图片</el-radio-button>
          </el-radio-group>
          <el-input
            v-model="settings.bgValue"
            :placeholder="
              settings.bgType === 'image'
                ? '图片 URL，或点下面上传'
                : 'CSS 渐变，留空用默认'
            "
            clearable
          />
          <div class="flex items-center gap-2 mt-2">
            <input
              ref="bgFileRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onPickBackground"
            />
            <el-button
              size="small"
              :loading="bgProcessing"
              @click="pickBackground"
              >上传图片</el-button
            >
            <el-button
              v-if="settings.bgValue"
              size="small"
              text
              @click="clearBackground"
              >清除</el-button
            >
          </div>
          <div class="hint">
            上传的图片在<b>本地</b>压缩后存进浏览器（localStorage），不会上传到服务器；
            渐变示例：<code>linear-gradient(135deg,#0f1320,#243b55)</code>。
          </div>
        </el-form-item>

        <el-form-item label="公告（支持 Markdown）">
          <el-input
            v-model="settings.notice"
            type="textarea"
            :autosize="{ minRows: 5, maxRows: 12 }"
          />
          <div class="hint">
            支持标题、粗体、斜体、列表、引用、代码、链接；出于安全不执行原始
            HTML。
          </div>
        </el-form-item>

        <el-form-item label="嵌入壁纸引擎（iframe）">
          <el-input
            :model-value="iframeCode"
            type="textarea"
            :rows="3"
            readonly
          />
          <el-button class="mt-2" size="small" @click="copyIframe"
            >复制嵌入代码</el-button
          >
          <div class="hint">
            壁纸引擎里选「网页」类型，把上面代码存成本地 html
            打开即可；也可直接把看板地址填进去。
          </div>
        </el-form-item>

        <div class="flex gap-2 mt-4">
          <el-button size="small" @click="resetLayout">重置元素位置</el-button>
          <el-button size="small" type="primary" @click="toggleEdit">
            {{ editMode ? "退出布局编辑" : "调整元素位置" }}
          </el-button>
          <el-button size="small" text @click="backToConsole"
            >返回控制台</el-button
          >
        </div>
        <div class="hint mt-2">
          设置自动保存在本机浏览器（localStorage），换台机器需重新设置。
        </div>
      </el-form>
    </el-drawer>
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, title: "看板" });

const STORAGE_KEY = "mi-board-settings-v1";

const DEFAULT_LAYOUT: Record<string, { x: number; y: number }> = {
  clock: { x: 50, y: 26 },
  subject: { x: 50, y: 58 },
  weather: { x: 20, y: 30 },
  notice: { x: 80, y: 32 },
};

function defaultSettings() {
  return {
    identity: "",
    termStart: "",
    showClock: true,
    showSubject: true,
    showWeather: true,
    showNotice: true,
    showSeconds: true,
    showHints: true,
    // 预警滚动速度（字/秒）。中文滚动阅读比静读慢，默认取 4 字/秒
    warningSpeed: 4,
    theme: "light" as "light" | "dark",
    // 文字阴影：auto 跟随配色，也可强制深色/浅色/无
    textShadow: "auto" as "auto" | "dark" | "light" | "none",
    scale: 100,
    bgType: "gradient" as "gradient" | "image",
    bgValue: "",
    weatherLocation: "",
    weatherLocationName: "",
    notice:
      "## 公告\n\n在**看板设置**里写点什么吧～\n\n- 支持 Markdown\n- 内容只存在本机",
    layout: JSON.parse(JSON.stringify(DEFAULT_LAYOUT)) as Record<
      string,
      { x: number; y: number }
    >,
  };
}

const settings = reactive(defaultSettings());
const board = ref<any>(null);
const weather = ref<any>(null);
const now = ref(new Date());
const editMode = ref(false);
const drawer = ref(false);
const consoleUrl = ref("https://mornheisland.heycrab.xyz");

const { renderMarkdownLite } = useMarkdownLite();

// ── 持久化 ──
function loadSettings() {
  if (!import.meta.client) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const base = defaultSettings();
    Object.assign(settings, { ...base, ...saved });
    settings.layout = { ...base.layout, ...(saved.layout || {}) };
  } catch {
    /* 坏数据就用默认值 */
  }
}
/** 返回是否写成功：base64 背景图有可能撑爆 localStorage 配额 */
function saveSettings(): boolean {
  if (!import.meta.client) return true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

// ── 时间 ──
const pad = (n: number) => String(n).padStart(2, "0");
const clockText = computed(
  () => `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}`,
);
const secondsText = computed(() => `:${pad(now.value.getSeconds())}`);
const dateText = computed(() => {
  const w = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
    now.value.getDay()
  ];
  return `${now.value.getFullYear()}年${now.value.getMonth() + 1}月${now.value.getDate()}日 ${w}`;
});
const hhmm = computed(() => clockText.value);

// ── 单双周 ──
const currentWeek = computed<number | null>(() => {
  if (!settings.termStart) return null;
  const start = new Date(`${settings.termStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (days < 0) return null;
  return Math.floor(days / 7) + 1;
});

const identity = computed(() => {
  if (import.meta.client) {
    const sp = new URLSearchParams(window.location.search);
    // ?id= 优先（推荐传班级 ID）；?identity= 保留兼容旧的班级标识写法
    const q = sp.get("id") || sp.get("identity");
    if (q) return q;
  }
  return settings.identity;
});

const todayEntries = computed<any[]>(() => {
  if (!board.value?.days) return [];
  const dow = now.value.getDay();
  const week = currentWeek.value;
  const out: any[] = [];
  const seen = new Set<string>();
  for (const day of board.value.days) {
    if (!(day.weekDays || []).includes(dow)) continue;
    if (week != null) {
      /*
       * 单双周优先用 weekDiv（0=每周 / 1=单周 / 2=双周）算奇偶。
       * 不能用 weeks 数组：那是 [1]/[2] 这种有限周次，学期往后走一旦超出范围，
       * 整天都会被过滤掉——表现就是"明明是双周，看板却说今天没有课"。
       */
      const div = Number(day.weekDiv ?? 0);
      if (div === 1 && week % 2 === 0) continue;
      if (div === 2 && week % 2 === 1) continue;
      // 兼容早期没有 weekDiv 的数据
      if (
        day.weekDiv == null &&
        Array.isArray(day.weeks) &&
        !day.weeks.includes(week)
      )
        continue;
    }
    for (const e of day.entries || []) {
      const key = `${e.start}-${e.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }
  return out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
});

// ── 考试安排：与标准课表重叠的时段以考试为准 ──
const pad2 = (n: number) => String(n).padStart(2, "0");
/** 本地日期 YYYY-MM-DD（不能用 toISOString，那是 UTC，东八区会错一天） */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 账号级考试安排（来自服务端，该账号下所有班级共用） */
const serverExams = ref<any[]>([]);

async function loadExams() {
  const id = identity.value;
  if (!id) {
    serverExams.value = [];
    return;
  }
  try {
    const res: any = await $fetch(
      `/api/v1/ci/${encodeURIComponent(id)}/exams.json`,
    );
    serverExams.value = Array.isArray(res?.entries) ? res.entries : [];
  } catch {
    // 取不到就当没有考试安排，不影响课表显示
    serverExams.value = [];
  }
}

function openExamsPage() {
  if (import.meta.client) window.open("/exams", "_blank", "noopener");
}

const todayExams = computed<any[]>(() => {
  const today = ymd(now.value);
  return (serverExams.value || [])
    .filter(
      (e: any) =>
        e &&
        e.date === today &&
        e.subject &&
        e.start &&
        e.end &&
        e.end > e.start,
    )
    .map((e: any) => ({
      name: "考试",
      type: "exam",
      start: e.start,
      end: e.end,
      subject: e.subject,
      teacher: null,
      isExam: true,
    }))
    .sort((a: any, b: any) => a.start.localeCompare(b.start));
});

/**
 * 生效课表 = 标准课表中「不与任何考试重叠」的时段 + 全部考试时段，按时间排序。
 * 半开区间比较：aStart < bEnd && bStart < aEnd。
 */
const effectiveEntries = computed<any[]>(() => {
  const std = todayEntries.value;
  const exams = todayExams.value;
  if (!exams.length) return std;
  const overlaps = (a: any, b: any) => a.start < b.end && b.start < a.end;
  const kept = std.filter((s: any) => !exams.some((e: any) => overlaps(s, e)));
  return [...kept, ...exams].sort((a, b) =>
    String(a.start).localeCompare(String(b.start)),
  );
});

const currentEntry = computed<any | null>(
  () =>
    effectiveEntries.value.find(
      (e) => e.start <= hhmm.value && hhmm.value < e.end,
    ) || null,
);
const nextEntry = computed<any | null>(
  () => effectiveEntries.value.find((e) => e.start > hhmm.value) || null,
);

const toMin = (t: string) => {
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const progress = computed(() => {
  const e = currentEntry.value;
  if (!e) return 0;
  const s = toMin(e.start);
  const en = toMin(e.end);
  return Math.max(
    0,
    Math.min(1, (toMin(hhmm.value) - s) / Math.max(1, en - s)),
  );
});
const remainMinutes = computed(() => {
  const e = currentEntry.value;
  if (!e) return 0;
  return Math.max(
    0,
    toMin(e.end) - toMin(hhmm.value) - (now.value.getSeconds() > 0 ? 1 : 0) + 1,
  );
});

const currentMain = computed(() => {
  const e = currentEntry.value;
  if (!e) return "";
  if (e.isExam) return e.subject || "考试";
  if (e.type === "class") return e.subject || e.name || "上课";
  return (
    e.name ||
    (e.type === "break" ? "课间" : e.type === "activity" ? "活动" : "休息")
  );
});
const nextMain = computed(() => {
  const e = nextEntry.value;
  if (!e) return "";
  if (e.isExam) return e.subject || "考试";
  if (e.type === "class") return e.subject || e.name || "上课";
  return e.name || (e.type === "break" ? "课间" : "下一节");
});

const noticeHtml = computed(() => renderMarkdownLite(settings.notice || ""));

// ── 布局拖动 ──
function posStyle(key: string) {
  const p = settings.layout[key] || { x: 50, y: 50 };
  return {
    left: `${p.x}%`,
    top: `${p.y}%`,
    transform: "translate(-50%, -50%)",
  };
}
let dragKey: string | null = null;
function onPointerDown(key: string, e: PointerEvent) {
  if (!editMode.value) return;
  dragKey = key;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  e.preventDefault();
}
function onPointerMove(e: PointerEvent) {
  if (!dragKey) return;
  const x = Math.max(2, Math.min(98, (e.clientX / window.innerWidth) * 100));
  const y = Math.max(2, Math.min(98, (e.clientY / window.innerHeight) * 100));
  settings.layout[dragKey] = {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}
function onPointerUp() {
  if (!dragKey) return;
  dragKey = null;
  saveSettings();
}
function resetLayout() {
  settings.layout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  saveSettings();
  ElMessage.success("已重置元素位置");
}
function toggleEdit() {
  editMode.value = !editMode.value;
  drawer.value = false;
}

// ── 背景与缩放 ──
const rootStyle = computed(() => {
  const style: Record<string, string> = { fontSize: `${settings.scale}%` };
  if (settings.bgValue) {
    if (settings.bgType === "image") {
      style.backgroundImage = `url("${settings.bgValue}")`;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center";
      style.backgroundRepeat = "no-repeat";
    } else {
      style.background = settings.bgValue;
    }
  }
  return style;
});

const iframeCode = computed(() => {
  const origin = import.meta.client
    ? window.location.origin
    : "https://你的控制台域名";
  const q = settings.identity
    ? `?id=${encodeURIComponent(settings.identity)}`
    : "";
  return `<iframe src="${origin}/board${q}" style="width:100vw;height:100vh;border:0" allow="fullscreen"></iframe>`;
});
async function copyIframe() {
  try {
    await navigator.clipboard.writeText(iframeCode.value);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}

// ── 天气图标 ──
function weatherEmoji(code: string): string {
  const n = Number(code);
  if (!n) return "🌡";
  if (n >= 100 && n <= 103) return "☀️";
  if (n === 104) return "⛅";
  if (n >= 150 && n <= 153) return "🌙";
  if (n >= 300 && n <= 399) return "🌧";
  if (n >= 400 && n <= 499) return "❄️";
  if (n >= 500 && n <= 515) return "🌫";
  return "🌤";
}

// ── 数据拉取 ──
async function loadBoard() {
  const id = identity.value;
  if (!id) {
    board.value = null;
    return;
  }
  try {
    const res: any = await $fetch(
      `/api/v1/ci/${encodeURIComponent(id)}/board.json`,
    );
    board.value = res;
  } catch {
    board.value = null;
  }
}
async function loadWeather() {
  try {
    const loc = String(settings.weatherLocation || "").trim();
    const url = loc
      ? `/api/v1/public/weather.json?location=${encodeURIComponent(loc)}`
      : "/api/v1/public/weather.json";
    const res: any = await $fetch(url);
    weather.value = res?.now ? res : null;
  } catch {
    /* 天气失败不影响其他元素 */
  }
}

// ── 天气位置搜索（城市名 → 和风 LocationID）──
const cityQuery = ref("");
const cityResults = ref<any[]>([]);
const citySearching = ref(false);

async function searchCity() {
  const q = cityQuery.value.trim();
  if (q.length < 2) {
    ElMessage.warning("请至少输入 2 个字的城市名");
    return;
  }
  citySearching.value = true;
  try {
    const res: any = await $fetch(
      `/api/v1/public/weather/lookup?q=${encodeURIComponent(q)}`,
    );
    cityResults.value = Array.isArray(res?.results) ? res.results : [];
    if (!cityResults.value.length) ElMessage.info("没找到匹配的城市");
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "城市搜索失败");
  } finally {
    citySearching.value = false;
  }
}

function clearCity() {
  settings.weatherLocation = "";
  settings.weatherLocationName = "";
  cityResults.value = [];
  cityQuery.value = "";
  saveSettings();
  loadWeather();
}

function backToConsole() {
  if (import.meta.client) window.location.href = "/";
}

// ── 班级列表（登录了就直接拉，没登录给出提示）──
const classList = ref<any[]>([]);
const classLoadState = ref<"idle" | "loading" | "ok" | "anon">("idle");

async function loadClassList() {
  if (!import.meta.client) return;
  const token = localStorage.getItem("token");
  if (!token) {
    classLoadState.value = "anon";
    return;
  }
  classLoadState.value = "loading";
  try {
    const res: any = await $fetch("/api/v1/console/ci/class/list", {
      headers: { Authorization: `Bearer ${token}` },
    });
    classList.value = Array.isArray(res?.data) ? res.data : [];
    classLoadState.value = "ok";
  } catch {
    // token 过期或后端拒绝，按未登录处理，让用户手动填
    classLoadState.value = "anon";
  }
}

function onPickClass() {
  saveSettings();
  loadBoard();
  loadExams();
}

// ── 预警滚动 ──
const warningItems = computed<any[]>(() => {
  const list = weather.value?.warnings;
  return Array.isArray(list) ? list.filter((w: any) => w?.title) : [];
});
/** 复制一份用于无缝滚动 */
const warningLoop = computed<any[]>(() => [
  ...warningItems.value,
  ...warningItems.value,
]);

/** 预警文案总字数（标题 + 正文），用于算滚动时长 */
const warningTotalChars = computed(() =>
  warningItems.value.reduce(
    (n: number, w: any) =>
      n + String(w.title || "").length + String(w.text || "").length,
    0,
  ),
);

/**
 * 滚动时长 = 总字数 / 速度。
 * 轨道里是两份内容、位移 -50%，所以走完一份正好等于「看完全部预警」，
 * 由此「字/秒」就是真实阅读速度，可以直接当作可调参数。
 */
const warningScrollSeconds = computed(() => {
  const speed = Math.max(1, Number(settings.warningSpeed) || 4);
  return Math.max(24, Math.round(warningTotalChars.value / speed));
});

function warningLevelClass(color: string): string {
  const c = String(color || "").toLowerCase();
  if (c.includes("red")) return "lv-red";
  if (c.includes("orange")) return "lv-orange";
  if (c.includes("yellow")) return "lv-yellow";
  if (c.includes("blue")) return "lv-blue";
  return "lv-default";
}

// ── 背景图片：本地压缩成 base64，不上传服务器 ──
const bgFileRef = ref<HTMLInputElement | null>(null);
const bgProcessing = ref(false);

function pickBackground() {
  bgFileRef.value?.click();
}

/** 等比缩到 maxWidth 以内再转 JPEG，避免把 localStorage 撑爆 */
function downscaleImage(
  file: File,
  maxWidth: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / (img.width || maxWidth));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("浏览器不支持 canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("无法读取这张图片"));
    };
    img.src = objectUrl;
  });
}

async function onPickBackground(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // 允许重复选同一个文件
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    ElMessage.error("请选择图片文件");
    return;
  }

  bgProcessing.value = true;
  const prevType = settings.bgType;
  const prevValue = settings.bgValue;
  try {
    // 先按 2560px 压；存不下再退到 1280px 更狠的压缩
    let dataUrl = await downscaleImage(file, 2560, 0.85);
    settings.bgType = "image";
    settings.bgValue = dataUrl;
    if (!saveSettings()) {
      dataUrl = await downscaleImage(file, 1280, 0.7);
      settings.bgValue = dataUrl;
      if (!saveSettings()) {
        settings.bgType = prevType;
        settings.bgValue = prevValue;
        saveSettings();
        ElMessage.error(
          "这张图太大，浏览器存储放不下。换张小一点的，或用图片直链。",
        );
        return;
      }
      ElMessage.warning("原图太大，已用更小的尺寸保存");
      return;
    }
    const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
    ElMessage.success(`背景已更新（约 ${kb} KB）`);
  } catch (err: any) {
    settings.bgType = prevType;
    settings.bgValue = prevValue;
    ElMessage.error(err?.message || "图片处理失败");
  } finally {
    bgProcessing.value = false;
  }
}

function clearBackground() {
  settings.bgValue = "";
  saveSettings();
}

watch(
  () => settings.weatherLocation,
  (id) => {
    if (!id) return;
    const hit = cityResults.value.find((c) => c.id === id);
    if (hit) {
      const adm = hit.adm2 && hit.adm2 !== hit.name ? hit.adm2 : hit.adm1;
      settings.weatherLocationName = adm ? `${hit.name}·${adm}` : hit.name;
    }
    saveSettings();
    loadWeather();
  },
);

let clockTimer: any, boardTimer: any, weatherTimer: any, examsTimer: any;

onMounted(() => {
  loadSettings();
  if (import.meta.client) consoleUrl.value = window.location.origin;

  // 从控制台「配置考试安排」点进来时直接展开设置抽屉
  if (
    import.meta.client &&
    new URLSearchParams(window.location.search).get("settings") === "1"
  ) {
    drawer.value = true;
  }

  loadBoard();
  loadWeather();
  loadClassList();
  loadExams();

  clockTimer = setInterval(() => {
    now.value = new Date();
  }, 1000);
  // 课表与天气都是低频数据，没必要跟着秒针刷
  boardTimer = setInterval(loadBoard, 5 * 60 * 1000);
  weatherTimer = setInterval(loadWeather, 10 * 60 * 1000);
  examsTimer = setInterval(loadExams, 10 * 60 * 1000);

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  clearInterval(clockTimer);
  clearInterval(boardTimer);
  clearInterval(weatherTimer);
  clearInterval(examsTimer);
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("keydown", onKeydown);
});

function onKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.key === "e" || e.key === "E") {
    e.preventDefault();
    editMode.value = !editMode.value;
  }
}

watch(
  () => settings.identity,
  () => {
    saveSettings();
    loadBoard();
    loadExams();
  },
);
watch(() => settings.termStart, saveSettings);
watch(settings, saveSettings, { deep: true });
</script>

<style scoped>
.board-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #0f1320 0%, #1a2238 45%, #243b55 100%);
  color: #f5f7fb;
  /*
   * 可读性：看板背景可能是任意一张壁纸（包括大面积亮白），纯白字直接糊掉。
   * 给所有文字加一层深色描边阴影——紧贴字边的一层保证边缘清晰，
   * 外扩的一层压住背景亮度。text-shadow 是可继承属性，加在根上即可覆盖全部文字。
   */
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.6),
    0 2px 10px rgba(0, 0, 0, 0.4);
  font-family:
    "HarmonyOS Sans SC",
    "Microsoft YaHei",
    "PingFang SC",
    system-ui,
    -apple-system,
    sans-serif;
  user-select: none;
  cursor: default;
}
/* 深色文字（配浅色背景）时反过来用浅色描边，否则阴影会糊成一团黑 */
.board-root.theme-dark {
  color: #131722;
  text-shadow:
    0 1px 2px rgba(255, 255, 255, 0.8),
    0 2px 8px rgba(255, 255, 255, 0.55);
}
/*
 * 手动指定阴影时覆盖上面「跟随配色」的结果。
 * 这两条必须写在 .theme-dark 之后：同优先级时靠源码顺序决胜。
 */
.board-root.shadow-dark {
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.6),
    0 2px 10px rgba(0, 0, 0, 0.4);
}
.board-root.shadow-light {
  text-shadow:
    0 1px 2px rgba(255, 255, 255, 0.8),
    0 2px 8px rgba(255, 255, 255, 0.55);
}
.board-root.shadow-none {
  text-shadow: none;
}
/* 有实色底的元素不要继承描边阴影，否则字看起来发脏 */
.exam-chip,
.warning-tag,
.board-gear {
  text-shadow: none;
}
.md-body :deep(code) {
  text-shadow: none;
}
/* 预警条自己是深色磨砂玻璃，无论哪种配色都该用深色阴影 */
.warning-bar {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
.board-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 40%,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.28) 100%
  );
  pointer-events: none;
}
/*
 * 深色文字模式下把遮罩换成"提亮"而不是"压暗"。
 * 这才是深色字可读性的关键：在暗背景上给深色字加任何阴影都没用，
 * 必须先把背景提亮，字才有对比。
 */
.board-root.theme-dark .board-veil {
  background: radial-gradient(
    circle at 50% 40%,
    rgba(255, 255, 255, 0.28) 0%,
    rgba(255, 255, 255, 0.52) 100%
  );
}

.el-block {
  position: absolute;
  padding: 0.4em 0.9em;
  border-radius: 0.6em;
  transition: outline-color 0.15s ease;
  outline: 2px dashed transparent;
}
.el-block.is-editing {
  outline-color: rgba(166, 194, 247, 0.85);
  background: rgba(20, 26, 40, 0.35);
  cursor: move;
}

/* 时钟 */
.clock-time {
  font-size: 7em;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
.clock-sec {
  font-size: 0.36em;
  font-weight: 500;
  opacity: 0.7;
  margin-left: 0.08em;
}
.clock-date {
  font-size: 1.15em;
  opacity: 0.78;
  margin-top: 0.35em;
  text-align: center;
}

/* 科目 */
.subject-label {
  font-size: 1em;
  letter-spacing: 0.32em;
  opacity: 0.72;
  text-transform: uppercase;
}
.subject-name {
  font-size: 3em;
  font-weight: 700;
  line-height: 1.15;
  margin: 0.06em 0;
}
.subject-sub {
  font-size: 1.05em;
  opacity: 0.72;
}
/* 考试时段的小标签 */
.exam-chip {
  display: inline-block;
  margin-right: 0.4em;
  padding: 0 0.42em;
  border-radius: 0.32em;
  font-size: 0.82em;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: #1b1b1b;
  background: #ffd166;
}
.progress-track {
  height: 0.34em;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  overflow: hidden;
  margin: 0.6em 0 0.4em;
  min-width: 12em;
}
.theme-dark .progress-track {
  background: rgba(0, 0, 0, 0.18);
}
.progress-fill {
  height: 100%;
  background: #a6c2f7;
  border-radius: 999px;
  transition: width 0.6s linear;
}

/* 天气 */
.weather-city {
  font-size: 0.9em;
  opacity: 0.6;
  margin-bottom: 0.1em;
}
.weather-row {
  display: flex;
  align-items: center;
  gap: 0.3em;
}
.weather-emoji {
  font-size: 2.4em;
  line-height: 1;
}
.weather-temp {
  font-size: 3.2em;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.weather-text {
  font-size: 1.2em;
  opacity: 0.9;
  margin-top: 0.15em;
}
.weather-sub {
  font-size: 0.95em;
  opacity: 0.66;
}
.weather-credit {
  font-size: 0.75em;
  opacity: 0.45;
  margin-top: 0.3em;
}
.weather-credit a {
  color: inherit;
}

/* 公告 */
.notice-block {
  max-width: 24em;
}
.md-body {
  font-size: 1.05em;
  line-height: 1.65;
}
.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3) {
  font-weight: 700;
  line-height: 1.25;
  margin: 0.5em 0 0.3em;
}
.md-body :deep(h1) {
  font-size: 1.7em;
}
.md-body :deep(h2) {
  font-size: 1.4em;
}
.md-body :deep(h3) {
  font-size: 1.15em;
}
.md-body :deep(p) {
  margin: 0.35em 0;
}
.md-body :deep(ul),
.md-body :deep(ol) {
  padding-left: 1.3em;
  margin: 0.35em 0;
}
.md-body :deep(li) {
  margin: 0.15em 0;
}
.md-body :deep(blockquote) {
  border-left: 0.2em solid currentColor;
  opacity: 0.8;
  padding-left: 0.7em;
  margin: 0.4em 0;
}
.md-body :deep(code) {
  background: rgba(255, 255, 255, 0.16);
  padding: 0.1em 0.32em;
  border-radius: 0.28em;
  font-size: 0.92em;
}
.theme-dark .md-body :deep(code) {
  background: rgba(0, 0, 0, 0.1);
}
.md-body :deep(.md-pre) {
  background: rgba(0, 0, 0, 0.35);
  padding: 0.6em 0.75em;
  border-radius: 0.4em;
  overflow: auto;
  font-size: 0.88em;
}
.md-body :deep(a) {
  color: #a6c2f7;
  text-decoration: underline;
}
.md-body :deep(hr) {
  border: 0;
  border-top: 0.08em solid currentColor;
  opacity: 0.25;
  margin: 0.7em 0;
}

/* 水印 */
.board-watermark {
  position: absolute;
  right: 1.4em;
  bottom: 1.1em;
  font-size: 0.82em;
  letter-spacing: 0.06em;
  color: inherit;
  opacity: 0.38;
  text-decoration: none;
  transition: opacity 0.2s ease;
}
.board-watermark:hover {
  opacity: 0.75;
}

/* 设置按钮：做成明显的胶囊，别再用一个几乎看不见的小圆点 */
.board-gear {
  position: absolute;
  left: 1em;
  bottom: 1em;
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.42em 0.9em;
  border-radius: 999px;
  border: 1px solid currentColor;
  font-size: 0.92em;
  color: inherit;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(6px);
  opacity: 0.62;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;
}
.theme-dark .board-gear {
  background: rgba(0, 0, 0, 0.1);
}
.board-gear:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.3);
}
.gear-icon {
  font-size: 1.05em;
}

/* 底部操作提示 */
.board-hints {
  position: absolute;
  left: 50%;
  bottom: 1.15em;
  transform: translateX(-50%);
  max-width: 88vw;
  text-align: center;
  font-size: 0.86em;
  line-height: 1.5;
  color: inherit;
  opacity: 0.62;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.board-hints kbd {
  display: inline-block;
  padding: 0 0.32em;
  border-radius: 0.24em;
  border: 1px solid currentColor;
  font-family: inherit;
  font-size: 0.92em;
  opacity: 0.9;
}

/* 顶部预警：悬浮磨砂玻璃胶囊，圆角，不再贴着屏幕边缘铺满 */
.warning-bar {
  position: absolute;
  top: 0.9em;
  left: 50%;
  transform: translateX(-50%);
  width: min(92vw, 1400px);
  z-index: 8;
  font-size: 0.95em;
  color: #fff;
  pointer-events: auto;
}
.warning-glass {
  position: relative;
  overflow: hidden;
  padding: 0.42em 1.1em;
  border-radius: 999px;
  /* 磨砂玻璃：半透明底 + 背景模糊 + 细描边 + 柔和投影 */
  background:
    linear-gradient(90deg, rgba(214, 68, 48, 0.3), rgba(226, 142, 40, 0.3)),
    rgba(24, 28, 38, 0.34);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 8px 26px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}
/* 遮罩只加在视口上，不能加在玻璃层，否则胶囊的边框和投影也会被一起淡掉 */
.warning-viewport {
  overflow: hidden;
  mask-image: linear-gradient(
    90deg,
    transparent 0,
    #000 2.2em,
    #000 calc(100% - 2.2em),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0,
    #000 2.2em,
    #000 calc(100% - 2.2em),
    transparent 100%
  );
}
.warning-track {
  display: inline-flex;
  white-space: nowrap;
  /*
   * 无缝滚动要点：轨道里正好放两份内容，位移 -50% 正好是一份的宽度。
   * 间距必须用 item 的 margin-right 而不是 flex gap —— 否则轨道宽度会多出
   * 一个「两份之间的 gap」，-50% 就会差半个间距，循环时会跳一下。
   */
  animation: warning-scroll 40s linear infinite;
  will-change: transform;
}
.warning-bar:hover .warning-track {
  animation-play-state: paused;
}
@keyframes warning-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
.warning-item {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5em;
  margin-right: 3.2em;
}
.warning-tag {
  flex: none;
  padding: 0 0.42em;
  border-radius: 0.32em;
  font-size: 0.82em;
  font-weight: 600;
  color: #1b1b1b;
  background: #fff;
}
.warning-tag.lv-red {
  background: #ff5c5c;
  color: #fff;
}
.warning-tag.lv-orange {
  background: #ffa64d;
}
.warning-tag.lv-yellow {
  background: #ffe066;
}
.warning-tag.lv-blue {
  background: #9ecbff;
}
/* 标题比正文重，正文稍微压暗，读起来有层次 */
.warning-title {
  font-weight: 600;
}
.warning-detail {
  opacity: 0.86;
  font-size: 0.94em;
}
.warning-detail::before {
  content: "｜";
  opacity: 0.5;
  margin-right: 0.35em;
}
.warning-src {
  opacity: 0.6;
  font-size: 0.86em;
}
.board-edithint {
  position: absolute;
  left: 50%;
  top: 3.9em;
  z-index: 6;
  transform: translateX(-50%);
  font-size: 0.85em;
  padding: 0.3em 0.9em;
  border-radius: 999px;
  background: rgba(166, 194, 247, 0.9);
  color: #10151f;
}

.city-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  margin-top: 4px;
}
</style>
