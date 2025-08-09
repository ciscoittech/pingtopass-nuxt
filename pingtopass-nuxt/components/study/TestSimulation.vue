<template>
  <main
    data-test="test-simulation"
    role="main"
    :aria-label="`Exam Simulation - ${examName}`"
    :class="[
      'test-simulation min-h-screen bg-gray-50',
      {
        'mobile-layout': isMobile,
        'exam-mode': simulationState === 'active',
        'fullscreen-mode': isFullscreen
      }
    ]"
    @contextmenu="$event.preventDefault()"
    @keydown="handleKeyboardShortcut"
    @copy="$event.preventDefault()"
    @paste="$event.preventDefault()"
  >
    <!-- Loading State -->
    <div
      v-if="isLoading"
      data-test="simulation-loading"
      class="flex items-center justify-center min-h-screen"
    >
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-xl font-semibold text-gray-900 mb-2">Preparing exam simulation...</p>
        <p class="text-gray-600">Loading questions and initializing secure environment</p>
        <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
          <p class="text-sm text-blue-800">This may take a few moments for security verification</p>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error && !isOffline"
      data-test="error-state"
      class="flex items-center justify-center min-h-screen"
    >
      <div class="text-center max-w-md">
        <div class="text-red-500 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Simulation Error</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button
          data-test="retry-button"
          @click="initializeExamSimulation"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    </div>

    <!-- Offline Mode -->
    <div
      v-else-if="isOffline"
      data-test="offline-message"
      class="fixed top-4 left-4 right-4 bg-orange-100 border border-orange-300 rounded-lg p-4 z-50"
    >
      <div class="flex items-center">
        <svg class="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span class="text-orange-800">You're working offline. Progress will be saved when connection is restored.</span>
      </div>
    </div>

    <!-- Exam Instructions -->
    <div
      v-else-if="simulationState === 'instructions'"
      data-test="exam-instructions"
      class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div class="text-center">
            <h1 class="text-3xl font-bold text-white mb-2">{{ examName }}</h1>
            <p class="text-blue-100">Official Certification Exam Simulation</p>
          </div>
        </div>

        <!-- Exam Information -->
        <div class="px-8 py-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Exam Information</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ questionCount }}</div>
              <div class="text-sm text-gray-600">Questions</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">{{ timeLimit }}</div>
              <div class="text-sm text-gray-600">Minutes</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-600">{{ passingScore }}%</div>
              <div class="text-sm text-gray-600">Passing Score</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-orange-600">#{{ attemptNumber }}</div>
              <div class="text-sm text-gray-600">Attempt</div>
            </div>
          </div>
        </div>

        <!-- Exam Rules -->
        <div data-test="exam-rules" class="px-8 py-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Exam Rules and Conditions</h2>
          <div class="prose prose-sm text-gray-700 space-y-4">
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 class="font-medium text-yellow-800 mb-2">⚠️ Important: Strict Exam Mode</h3>
              <ul class="space-y-2 text-yellow-700">
                <li class="flex items-start">
                  <span class="text-yellow-600 mr-2">•</span>
                  <span><strong>No going back:</strong> Once you move to the next question, you cannot return to previous questions</span>
                </li>
                <li class="flex items-start">
                  <span class="text-yellow-600 mr-2">•</span>
                  <span><strong>Timed environment:</strong> You have {{ timeLimit }} minutes to complete all {{ questionCount }} questions</span>
                </li>
                <li class="flex items-start">
                  <span class="text-yellow-600 mr-2">•</span>
                  <span><strong>No immediate feedback:</strong> You will not see correct answers or explanations until after submission</span>
                </li>
                <li class="flex items-start">
                  <span class="text-yellow-600 mr-2">•</span>
                  <span><strong>Auto-submit:</strong> Exam will automatically submit when time expires</span>
                </li>
              </ul>
            </div>

            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <h4 class="font-medium text-gray-900 mb-2">✅ Allowed</h4>
                <ul class="space-y-1 text-sm text-gray-600">
                  <li>• Calculator (built-in)</li>
                  <li>• Note-taking (digital notepad)</li>
                  <li>• Question flagging for review</li>
                  <li>• Answer changes before moving forward</li>
                </ul>
              </div>

              <div>
                <h4 class="font-medium text-gray-900 mb-2">❌ Prohibited</h4>
                <ul class="space-y-1 text-sm text-gray-600">
                  <li>• External websites or applications</li>
                  <li>• Copy/paste from questions</li>
                  <li>• Screenshots or recording</li>
                  <li>• Multiple browser tabs/windows</li>
                </ul>
              </div>
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 class="font-medium text-blue-800 mb-2">📊 Scoring</h4>
              <ul class="space-y-1 text-sm text-blue-700">
                <li>• You need <strong>{{ passingScore }}%</strong> or higher to pass</li>
                <li>• All questions are worth equal points</li>
                <li>• No penalty for wrong answers</li>
                <li>• Unanswered questions count as incorrect</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Start Button -->
        <div class="px-8 py-6 bg-gray-50 text-center">
          <div class="flex items-center justify-center space-x-4">
            <label class="flex items-center text-sm text-gray-600">
              <input
                v-model="agreedToRules"
                type="checkbox"
                class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required
              >
              I have read and understand the exam rules and conditions
            </label>
          </div>
          <button
            data-test="start-exam-button"
            @click="startExamSimulation"
            :disabled="!agreedToRules"
            :class="[
              'mt-6 px-8 py-3 text-lg font-semibold rounded-lg transition-colors',
              agreedToRules
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            ]"
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>

    <!-- Active Exam State -->
    <div
      v-else-if="simulationState === 'active' || simulationState === 'timeUp'"
      class="exam-environment"
    >
      <!-- Exam Header -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between py-4">
            <!-- Exam Info -->
            <div class="flex items-center space-x-4">
              <h1 class="text-lg font-semibold text-gray-900">{{ examCode }}</h1>
              <div data-test="question-progress" class="text-sm text-gray-500">
                Question {{ currentQuestionIndex + 1 }} of {{ questionCount }}
              </div>
            </div>

            <!-- Timer and Controls -->
            <div class="flex items-center space-x-4">
              <!-- Timer -->
              <div
                data-test="exam-timer"
                :class="[
                  'timer px-4 py-2 rounded-lg font-mono text-lg font-semibold',
                  isMobile && 'mobile-timer',
                  timeRemaining <= 600 ? 'bg-red-100 text-red-800 critical-alert' : 
                  timeRemaining <= 1800 ? 'bg-yellow-100 text-yellow-800 time-warning' :
                  'bg-blue-100 text-blue-800'
                ]"
              >
                {{ formatTime(timeRemaining) }}
              </div>

              <!-- Status Indicators -->
              <div class="flex items-center space-x-2 text-sm">
                <span class="text-gray-600">{{ answeredCount }}/{{ questionCount }} answered</span>
                <div v-if="flaggedQuestions.size > 0" class="text-orange-600">
                  {{ flaggedQuestions.size }} flagged
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Time Warnings -->
      <div
        v-if="timeRemaining <= 1800 && timeRemaining > 600"
        data-test="time-warning"
        class="bg-yellow-100 border-b border-yellow-300 px-4 py-2"
      >
        <div class="max-w-7xl mx-auto text-center">
          <span class="text-yellow-800 font-medium">
            ⚠️ {{ Math.floor(timeRemaining / 60) }} minutes remaining
          </span>
        </div>
      </div>

      <div
        v-if="timeRemaining <= 600"
        data-test="critical-time-alert"
        class="bg-red-100 border-b border-red-300 px-4 py-2 animate-pulse"
      >
        <div class="max-w-7xl mx-auto text-center">
          <span class="text-red-800 font-bold">
            🚨 CRITICAL: Only {{ Math.floor(timeRemaining / 60) }} minutes left!
          </span>
        </div>
      </div>

      <!-- Tab Change Warning -->
      <div
        v-if="showTabWarning"
        data-test="tab-change-warning"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 max-w-md mx-4">
          <div class="text-center">
            <div class="text-yellow-500 mb-4">
              <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Tab Change Detected</h3>
            <p class="text-gray-600 mb-4">
              You switched tabs or windows during the exam. This has been logged for security purposes.
            </p>
            <button
              @click="dismissTabWarning"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Return to Exam
            </button>
          </div>
        </div>
      </div>

      <!-- Developer Tools Warning -->
      <div
        v-if="showDevtoolsWarning"
        data-test="devtools-warning"
        class="fixed bottom-4 right-4 bg-red-100 border border-red-300 rounded-lg p-4 max-w-sm z-50"
      >
        <div class="flex items-start">
          <svg class="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 class="font-medium text-red-800">Security Alert</h4>
            <p class="text-sm text-red-700">Developer tools detected. This activity is being monitored.</p>
          </div>
        </div>
      </div>

      <!-- Main Question Area -->
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div
          data-test="exam-question-card"
          :class="[
            'bg-white rounded-lg border border-gray-200 exam-mode',
            {
              'disabled': simulationState === 'timeUp'
            }
          ]"
        >
          <!-- Question Content -->
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <span class="text-sm font-medium text-gray-600">
                    Question {{ currentQuestionIndex + 1 }}
                  </span>
                  <span
                    v-if="currentQuestion?.type === 'multiple'"
                    class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                  >
                    Multiple Choice
                  </span>
                  <span
                    v-if="currentQuestion?.difficulty"
                    class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                  >
                    Level {{ currentQuestion.difficulty }}
                  </span>
                </div>

                <div
                  data-test="question-text"
                  class="text-lg text-gray-900 leading-relaxed mb-4"
                  oncopy="return false"
                  onpaste="return false"
                >
                  {{ currentQuestion?.text }}
                </div>
              </div>

              <!-- Flag Button -->
              <button
                data-test="flag-question-button"
                @click="toggleQuestionFlag"
                :class="[
                  'ml-4 p-2 rounded-lg transition-colors',
                  isQuestionFlagged
                    ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                ]"
                :title="isQuestionFlagged ? 'Remove flag' : 'Flag for review'"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 01.707 1.707L14.414 8l2.293 2.293A1 1 0 0116 12H4a1 1 0 01-1-1V5z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <!-- Answer Options -->
            <div class="space-y-3">
              <div
                v-for="(option, index) in currentQuestion?.answerOptions"
                :key="option.id"
                :data-test="`answer-option-${index}`"
                :class="[
                  'border border-gray-200 rounded-lg p-4 cursor-pointer transition-all',
                  isMobile && 'touch-target',
                  {
                    'bg-blue-50 border-blue-300 ring-2 ring-blue-500': isAnswerSelected(option.id),
                    'hover:bg-gray-50 hover:border-gray-300': !isAnswerSelected(option.id) && simulationState === 'active',
                    'pointer-events-none opacity-50': simulationState === 'timeUp'
                  }
                ]"
                @click="selectAnswer(option.id)"
                :disabled="simulationState === 'timeUp'"
              >
                <div class="flex items-start">
                  <div class="flex-shrink-0 mr-3 mt-1">
                    <div
                      v-if="currentQuestion?.type === 'single'"
                      :class="[
                        'w-4 h-4 rounded-full border-2 transition-colors',
                        isAnswerSelected(option.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      ]"
                    >
                      <div
                        v-if="isAnswerSelected(option.id)"
                        class="w-2 h-2 bg-white rounded-full m-0.5"
                      ></div>
                    </div>
                    <div
                      v-else
                      :class="[
                        'w-4 h-4 rounded border-2 transition-colors',
                        isAnswerSelected(option.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      ]"
                    >
                      <svg
                        v-if="isAnswerSelected(option.id)"
                        class="w-3 h-3 text-white m-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1">
                    <span class="text-gray-900">{{ option.text }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation Footer -->
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <!-- Question Time -->
              <div
                v-if="showQuestionTimer"
                data-test="question-time-spent"
                class="text-sm text-gray-500"
              >
                Time: {{ formatTime(currentQuestionTime) }}
              </div>

              <!-- Answered Indicator -->
              <div v-if="isCurrentQuestionAnswered" class="text-sm text-green-600 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Answered
              </div>
            </div>

            <div class="flex items-center space-x-4">
              <!-- Skip Button -->
              <button
                v-if="!isLastQuestion"
                @click="skipQuestion"
                class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Skip
              </button>

              <!-- Next Button -->
              <button
                v-if="!isLastQuestion"
                data-test="next-question-button"
                @click="nextQuestion"
                :disabled="simulationState === 'timeUp'"
                class="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Question
              </button>

              <!-- Submit Button (last question) -->
              <button
                v-if="isLastQuestion"
                data-test="submit-exam-button"
                @click="showSubmitConfirmation = true"
                :disabled="simulationState === 'timeUp'"
                class="px-6 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit Confirmation Dialog -->
    <div
      v-if="showSubmitConfirmation"
      data-test="submit-confirmation"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <div class="text-center">
          <div class="text-blue-500 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">Submit Exam?</h3>
          <p class="text-gray-600 mb-4">
            Are you sure you want to submit your exam? This action cannot be undone.
          </p>
          
          <div class="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <h4 class="font-medium text-gray-900 mb-2">Submission Summary:</h4>
            <div class="text-sm text-gray-700 space-y-1">
              <div>{{ answeredCount }} out of {{ questionCount }} questions answered</div>
              <div>{{ flaggedQuestions.size }} questions flagged for review</div>
              <div>Time remaining: {{ formatTime(timeRemaining) }}</div>
            </div>
            
            <div
              v-if="unansweredCount > 0"
              data-test="unanswered-warning"
              class="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg"
            >
              <div class="flex items-center text-yellow-800">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span class="text-sm font-medium">{{ unansweredCount }} unanswered question{{ unansweredCount > 1 ? 's' : '' }} will be marked incorrect</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-center space-x-4">
            <button
              @click="showSubmitConfirmation = false"
              class="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              data-test="confirm-submit"
              @click="submitExam"
              class="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Submission Error -->
    <div
      v-if="submissionError"
      data-test="submission-error"
      class="fixed bottom-4 right-4 bg-red-100 border border-red-300 rounded-lg p-4 max-w-sm z-50"
    >
      <div class="flex items-start">
        <svg class="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 class="font-medium text-red-800">Submission Failed</h4>
          <p class="text-sm text-red-700 mb-2">{{ submissionError }}</p>
          <button
            data-test="retry-submission"
            @click="retrySubmission"
            class="text-sm text-red-800 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    </div>

    <!-- Results State -->
    <div
      v-else-if="simulationState === 'results'"
      data-test="exam-results"
      class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <!-- Results Header -->
        <div
          :class="[
            'px-8 py-6 text-center',
            examResults?.passed
              ? 'bg-gradient-to-r from-green-600 to-green-700'
              : 'bg-gradient-to-r from-red-600 to-red-700'
          ]"
        >
          <div class="text-6xl mb-4">
            {{ examResults?.passed ? '🎉' : '😞' }}
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">
            Exam {{ examResults?.passed ? 'PASSED' : 'FAILED' }}
          </h1>
          <div
            data-test="final-score"
            class="text-4xl font-bold text-white mb-2"
          >
            {{ examResults?.score }}%
          </div>
          <div
            data-test="pass-fail-status"
            :class="[
              'inline-block px-4 py-2 rounded-full text-sm font-medium',
              examResults?.passed ? 'bg-green-500 bg-opacity-20 text-green-100 passed' : 'bg-red-500 bg-opacity-20 text-red-100 failed'
            ]"
          >
            {{ examResults?.passed ? 'PASSED' : 'FAILED' }} (Required: {{ passingScore }}%)
          </div>
        </div>

        <!-- Detailed Results -->
        <div class="px-8 py-6">
          <!-- Quick Stats -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">{{ examResults?.correctAnswers }}/{{ examResults?.totalQuestions }}</div>
              <div class="text-sm text-gray-600">Correct Answers</div>
            </div>
            <div class="text-center">
              <div data-test="time-analysis" class="text-2xl font-bold text-gray-900">{{ formatTime(examResults?.timeSpent || 0) }}</div>
              <div class="text-sm text-gray-600">Time Used</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">{{ calculatePercentile() }}</div>
              <div data-test="percentile-ranking" class="text-sm text-gray-600">{{ calculatePercentile() }}th Percentile</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">{{ flaggedQuestions.size }}</div>
              <div class="text-sm text-gray-600">Questions Flagged</div>
            </div>
          </div>

          <!-- Score Breakdown by Objective -->
          <div data-test="score-breakdown" class="mb-8">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Performance by Objective</h3>
            <div class="space-y-4">
              <div
                v-for="(score, objective) in examResults?.breakdown"
                :key="objective"
                :data-test="`objective-${objective}`"
                class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div class="flex-1">
                  <div class="font-medium text-gray-900">{{ formatObjectiveName(objective) }}</div>
                  <div class="text-sm text-gray-600">{{ getObjectiveWeight(objective) }}% of exam</div>
                </div>
                <div class="text-right">
                  <div
                    :class="[
                      'text-lg font-bold',
                      score >= passingScore ? 'text-green-600' : 'text-red-600'
                    ]"
                  >
                    {{ score }}%
                  </div>
                  <div
                    :class="[
                      'text-xs px-2 py-1 rounded-full',
                      score >= 90 ? 'bg-green-100 text-green-800' :
                      score >= 80 ? 'bg-blue-100 text-blue-800' :
                      score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    ]"
                  >
                    {{ getPerformanceLabel(score) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Performance Chart -->
          <div data-test="performance-chart" class="mb-8">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Score Breakdown Chart</h3>
            <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <canvas ref="performanceChart"></canvas>
            </div>
          </div>

          <!-- Study Recommendations -->
          <div data-test="study-recommendations" class="mb-8">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Study Recommendations</h3>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="prose prose-sm text-blue-800">
                {{ getStudyRecommendations() }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <!-- Certificate Generation (passing scores only) -->
            <button
              v-if="examResults?.passed && examResults.score >= passingScore"
              data-test="generate-certificate"
              @click="generateCertificate"
              class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Certificate
            </button>

            <!-- Review Answers -->
            <button
              @click="enterReviewMode"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Review Answers
            </button>

            <!-- Retry Exam -->
            <div v-if="!examResults?.passed || attemptNumber < maxAttempts">
              <button
                v-if="attemptNumber < maxAttempts"
                data-test="retry-exam"
                @click="retryExam"
                class="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry Exam ({{ maxAttempts - attemptNumber }} remaining)
              </button>
              
              <div
                v-else
                data-test="max-attempts-reached"
                class="text-center py-4"
              >
                <p class="text-gray-600">Maximum number of attempts reached</p>
                <p class="text-sm text-gray-500">Contact support for additional attempts</p>
              </div>
            </div>

            <!-- Failed Message -->
            <div
              v-if="!examResults?.passed"
              data-test="retry-message"
              class="text-center py-4"
            >
              <p class="text-red-600 font-medium">Don't give up! Review the weak areas and try again.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Mode -->
    <div
      v-else-if="simulationState === 'review'"
      class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
    >
      <!-- Review Header -->
      <div class="bg-white rounded-lg border border-gray-200 mb-6 p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Answer Review</h2>
            <p class="text-gray-600">Review your answers and explanations</p>
          </div>
          
          <div class="text-right">
            <div class="text-2xl font-bold text-gray-900">{{ examResults?.correctAnswers }}/{{ examResults?.totalQuestions }}</div>
            <div class="text-sm text-gray-600">{{ examResults?.score }}% Score</div>
          </div>
        </div>
      </div>

      <!-- Review Navigation -->
      <div data-test="review-navigation" class="bg-white rounded-lg border border-gray-200 mb-6 p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-medium text-gray-900">Question Navigation</h3>
          <div class="text-sm text-gray-600">
            Question {{ currentQuestionIndex + 1 }} of {{ questionCount }}
          </div>
        </div>
        
        <div class="grid grid-cols-10 gap-2">
          <button
            v-for="(question, index) in questions"
            :key="question.id"
            :data-test="`nav-question-${index + 1}`"
            @click="goToQuestion(index)"
            :class="[
              'w-8 h-8 text-xs rounded flex items-center justify-center transition-colors',
              {
                'bg-blue-600 text-white': index === currentQuestionIndex,
                'bg-green-100 text-green-800': isAnswerCorrect(question.id) && index !== currentQuestionIndex,
                'bg-red-100 text-red-800': !isAnswerCorrect(question.id) && examAnswers[question.id] && index !== currentQuestionIndex,
                'bg-gray-100 text-gray-600': !examAnswers[question.id] && index !== currentQuestionIndex,
                'ring-2 ring-orange-300': flaggedQuestions.has(question.id)
              }
            ]"
            :title="`Question ${index + 1}: ${getQuestionStatus(question.id)}`"
          >
            {{ index + 1 }}
          </button>
        </div>
        
        <div class="mt-4 flex items-center space-x-6 text-xs text-gray-600">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-green-100 rounded mr-2"></div>
            Correct
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-red-100 rounded mr-2"></div>
            Incorrect
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-gray-100 rounded mr-2"></div>
            Unanswered
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-blue-600 rounded mr-2"></div>
            Current
          </div>
        </div>
      </div>

      <!-- Review Question -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <span class="text-sm font-medium text-gray-600">
                Question {{ currentQuestionIndex + 1 }}
              </span>
              <span
                v-if="currentQuestion?.type === 'multiple'"
                class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
              >
                Multiple Choice
              </span>
              <span
                v-if="currentQuestion?.difficulty"
                class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                Level {{ currentQuestion?.difficulty }}
              </span>
              <span
                v-if="questionTimeSpent[currentQuestion?.id]"
                data-test="question-time-spent"
                class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
              >
                {{ questionTimeSpent[currentQuestion?.id] }} seconds
              </span>
            </div>

            <div class="text-lg text-gray-900 leading-relaxed mb-4">
              {{ currentQuestion?.text }}
            </div>
          </div>

          <!-- Review Status -->
          <div class="ml-4 text-center">
            <div
              :class="[
                'w-12 h-12 rounded-full flex items-center justify-center mb-2',
                isCurrentAnswerCorrect ? 'bg-green-100' : 'bg-red-100'
              ]"
            >
              <svg
                v-if="isCurrentAnswerCorrect"
                class="w-6 h-6 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <svg
                v-else
                class="w-6 h-6 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="text-xs text-gray-600">
              {{ isCurrentAnswerCorrect ? 'Correct' : 'Incorrect' }}
            </div>
          </div>
        </div>

        <!-- Answer Options Review -->
        <div class="space-y-3 mb-6">
          <div
            v-for="(option, index) in currentQuestion?.answerOptions"
            :key="option.id"
            :class="[
              'border rounded-lg p-4',
              {
                'border-green-300 bg-green-50': option.isCorrect,
                'border-red-300 bg-red-50': !option.isCorrect && userSelectedAnswers.includes(option.id),
                'border-gray-200 bg-gray-50': !option.isCorrect && !userSelectedAnswers.includes(option.id)
              }
            ]"
          >
            <div class="flex items-start">
              <div class="flex-shrink-0 mr-3 mt-1">
                <!-- Correct Answer Indicator -->
                <div v-if="option.isCorrect" data-test="correct-answer" class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                
                <!-- User Selected Answer Indicator -->
                <div
                  v-else-if="userSelectedAnswers.includes(option.id)"
                  data-test="user-selected-answer"
                  :class="[
                    'w-4 h-4 rounded-full flex items-center justify-center user-selected',
                    option.isCorrect ? 'bg-green-500' : 'bg-red-500'
                  ]"
                >
                  <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                
                <!-- Empty Indicator -->
                <div v-else class="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
              </div>
              
              <div class="flex-1">
                <span
                  :class="[
                    'text-gray-900',
                    {
                      'font-medium': option.isCorrect || userSelectedAnswers.includes(option.id)
                    }
                  ]"
                >
                  {{ option.text }}
                </span>
                
                <!-- Answer Labels -->
                <div class="mt-1 flex items-center space-x-2">
                  <span v-if="option.isCorrect" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Correct Answer
                  </span>
                  <span v-if="userSelectedAnswers.includes(option.id)" class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Your Selection
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Question Explanation -->
        <div
          v-if="currentQuestion?.explanation"
          data-test="question-explanation"
          class="border-t border-gray-200 pt-4"
        >
          <h4 class="font-medium text-gray-900 mb-2">Explanation</h4>
          <div class="prose prose-sm text-gray-700">
            {{ currentQuestion.explanation }}
          </div>
        </div>

        <!-- Review Feedback -->
        <div data-test="review-feedback" class="border-t border-gray-200 pt-4 mt-4">
          <div
            :class="[
              'p-4 rounded-lg',
              isCurrentAnswerCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            ]"
          >
            <div class="flex items-start">
              <div class="flex-shrink-0 mr-3">
                <svg
                  v-if="isCurrentAnswerCorrect"
                  class="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <svg
                  v-else
                  class="w-5 h-5 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <h5
                  :class="[
                    'font-medium mb-1',
                    isCurrentAnswerCorrect ? 'text-green-800' : 'text-red-800'
                  ]"
                >
                  {{ isCurrentAnswerCorrect ? 'Correct Answer!' : 'Incorrect Answer' }}
                </h5>
                <p
                  :class="[
                    'text-sm',
                    isCurrentAnswerCorrect ? 'text-green-700' : 'text-red-700'
                  ]"
                >
                  {{ getAnswerFeedback() }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            v-if="currentQuestionIndex > 0"
            @click="goToQuestion(currentQuestionIndex - 1)"
            class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Previous Question
          </button>
          
          <div class="flex items-center space-x-4">
            <button
              @click="showOnlyIncorrect = !showOnlyIncorrect"
              :class="[
                'px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2',
                showOnlyIncorrect
                  ? 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500'
              ]"
            >
              {{ showOnlyIncorrect ? 'Show All' : 'Show Incorrect Only' }}
            </button>
          </div>
          
          <button
            v-if="currentQuestionIndex < questionCount - 1"
            @click="goToQuestion(currentQuestionIndex + 1)"
            class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Next Question
          </button>
        </div>
      </div>
    </div>

    <!-- Screen Reader Announcements -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ screenReaderMessage }}
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useExamStore } from '~/stores/exam';
import { useStudyStore } from '~/stores/study';
import type { QuestionWithAnswers, Exam } from '~/types/exam';
import { Chart, registerables } from 'chart.js';
// @ts-ignore
import jsPDF from 'jspdf';

Chart.register(...registerables);

// Props
interface Props {
  examId: string;
  questionCount?: number;
  timeLimit?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  strictExamMode?: boolean;
  maxAttempts?: number;
}

const props = withDefaults(defineProps<Props>(), {
  questionCount: 100,
  timeLimit: 120,
  passingScore: 85,
  shuffleQuestions: true,
  strictExamMode: true,
  maxAttempts: 3
});

// Stores
const examStore = useExamStore();
const studyStore = useStudyStore();

// Reactive state
const isLoading = ref(true);
const error = ref<string | null>(null);
const isOffline = ref(false);
const isMobile = ref(false);
const isFullscreen = ref(false);

// Simulation states
const simulationState = ref<'instructions' | 'active' | 'timeUp' | 'results' | 'review'>('instructions');
const agreedToRules = ref(false);
const attemptNumber = ref(1);

// Exam data
const exam = ref<Exam | null>(null);
const questions = ref<QuestionWithAnswers[]>([]);
const currentQuestionIndex = ref(0);
const examAnswers = ref<Record<string, string[]>>({});
const answerTimestamps = ref<Record<string, number>>({});
const flaggedQuestions = ref<Set<string>>(new Set());
const questionTimeSpent = ref<Record<string, number>>({});

// Timer
const timeRemaining = ref(0);
const currentQuestionTime = ref(0);
const questionStartTime = ref(0);
let examTimer: NodeJS.Timeout | null = null;
let questionTimer: NodeJS.Timeout | null = null;

// UI state
const showSubmitConfirmation = ref(false);
const showTabWarning = ref(false);
const showDevtoolsWarning = ref(false);
const showOnlyIncorrect = ref(false);
const submissionError = ref<string | null>(null);
const screenReaderMessage = ref('');

// Results
const examResults = ref<any>(null);
const certificateData = ref<any>(null);

// Security tracking
const suspiciousActivity = ref<any[]>([]);
const sessionId = ref('');

// Chart reference
const performanceChart = ref<HTMLCanvasElement>();

// Computed properties
const examName = computed(() => exam.value?.name || 'Certification Exam');
const examCode = computed(() => exam.value?.code || 'EXAM-001');
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value]);
const isLastQuestion = computed(() => currentQuestionIndex.value === questions.value.length - 1);
const isCurrentQuestionAnswered = computed(() => {
  const questionId = currentQuestion.value?.id;
  return questionId ? !!examAnswers.value[questionId] : false;
});
const isQuestionFlagged = computed(() => {
  const questionId = currentQuestion.value?.id;
  return questionId ? flaggedQuestions.value.has(questionId) : false;
});
const answeredCount = computed(() => Object.keys(examAnswers.value).length);
const unansweredCount = computed(() => props.questionCount - answeredCount.value);
const userSelectedAnswers = computed(() => {
  const questionId = currentQuestion.value?.id;
  return questionId ? examAnswers.value[questionId] || [] : [];
});
const isCurrentAnswerCorrect = computed(() => {
  return isAnswerCorrect(currentQuestion.value?.id || '');
});
const showQuestionTimer = computed(() => simulationState.value === 'active');

// Methods
const initializeExamSimulation = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    // Fetch exam data
    await examStore.fetchExam(props.examId);
    exam.value = examStore.currentExam;

    // Initialize session
    sessionId.value = `exam-${props.examId}-${Date.now()}`;

    // Set up security monitoring
    setupSecurityMonitoring();

    // Check for offline mode
    isOffline.value = !navigator.onLine;

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to initialize exam simulation';
  } finally {
    isLoading.value = false;
  }
};

const startExamSimulation = async () => {
  try {
    isLoading.value = true;

    // Start exam session
    const session = await examStore.startExamSimulation(props.examId, {
      questionCount: props.questionCount,
      timeLimit: props.timeLimit,
      shuffleQuestions: props.shuffleQuestions
    });

    // Load questions
    questions.value = session.questions;
    
    // Shuffle questions if enabled
    if (props.shuffleQuestions) {
      shuffleQuestions();
    }

    // Shuffle answer options for each question
    questions.value.forEach(question => {
      shuffleAnswerOptions(question);
    });

    // Initialize timer
    timeRemaining.value = props.timeLimit * 60; // Convert minutes to seconds
    startExamTimer();

    // Initialize question timer
    startQuestionTimer();

    // Transition to active state
    simulationState.value = 'active';
    
    announceToScreenReader(`Exam started. ${props.questionCount} questions, ${props.timeLimit} minutes.`);

    // Enter fullscreen if supported
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen not supported or denied
      });
    }

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start exam simulation';
  } finally {
    isLoading.value = false;
  }
};

const shuffleQuestions = () => {
  const shuffled = [...questions.value];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  questions.value = shuffled;
};

const shuffleAnswerOptions = (question: QuestionWithAnswers) => {
  if (question.answerOptions) {
    const shuffled = [...question.answerOptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    question.answerOptions = shuffled;
  }
};

const startExamTimer = () => {
  if (examTimer) {
    clearInterval(examTimer);
  }

  examTimer = setInterval(() => {
    timeRemaining.value--;
    
    if (timeRemaining.value <= 0) {
      submitExamAutomatically();
    }
  }, 1000);
};

const startQuestionTimer = () => {
  questionStartTime.value = Date.now();
  currentQuestionTime.value = 0;

  if (questionTimer) {
    clearInterval(questionTimer);
  }

  questionTimer = setInterval(() => {
    currentQuestionTime.value = Math.floor((Date.now() - questionStartTime.value) / 1000);
  }, 1000);
};

const stopTimers = () => {
  if (examTimer) {
    clearInterval(examTimer);
    examTimer = null;
  }
  if (questionTimer) {
    clearInterval(questionTimer);
    questionTimer = null;
  }
};

const selectAnswer = (optionId: string) => {
  if (simulationState.value !== 'active') return;

  const questionId = currentQuestion.value?.id;
  if (!questionId) return;

  logUserAction('answer_selected', { questionId, optionId, timestamp: Date.now() });

  if (currentQuestion.value?.type === 'single') {
    examAnswers.value[questionId] = [optionId];
  } else if (currentQuestion.value?.type === 'multiple') {
    const current = examAnswers.value[questionId] || [];
    const index = current.indexOf(optionId);
    
    if (index === -1) {
      examAnswers.value[questionId] = [...current, optionId];
    } else {
      examAnswers.value[questionId] = current.filter(id => id !== optionId);
      if (examAnswers.value[questionId].length === 0) {
        delete examAnswers.value[questionId];
      }
    }
  }

  // Record timestamp
  answerTimestamps.value[questionId] = Date.now();
};

const saveAnswer = (selectedOptions: string[]) => {
  const questionId = currentQuestion.value?.id;
  if (!questionId) return;

  examAnswers.value[questionId] = selectedOptions;
  answerTimestamps.value[questionId] = Date.now();
};

const isAnswerSelected = (optionId: string): boolean => {
  const questionId = currentQuestion.value?.id;
  if (!questionId) return false;
  
  const selected = examAnswers.value[questionId] || [];
  return selected.includes(optionId);
};

const toggleQuestionFlag = () => {
  const questionId = currentQuestion.value?.id;
  if (!questionId) return;

  if (flaggedQuestions.value.has(questionId)) {
    flaggedQuestions.value.delete(questionId);
  } else {
    flaggedQuestions.value.add(questionId);
  }

  logUserAction('question_flagged', { questionId, flagged: flaggedQuestions.value.has(questionId) });
};

const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    // Record time spent on current question
    if (currentQuestion.value?.id) {
      questionTimeSpent.value[currentQuestion.value.id] = currentQuestionTime.value;
    }

    currentQuestionIndex.value++;
    startQuestionTimer();
    
    logUserAction('question_navigated', { 
      from: currentQuestionIndex.value - 1, 
      to: currentQuestionIndex.value 
    });

    announceToScreenReader(`Question ${currentQuestionIndex.value + 1} of ${props.questionCount}`);
  }
};

const skipQuestion = () => {
  nextQuestion(); // Same as next for now, but could add specific skip logic
  logUserAction('question_skipped', { questionIndex: currentQuestionIndex.value - 1 });
};

const goToQuestion = (index: number) => {
  if (index >= 0 && index < questions.value.length) {
    // Record time spent on current question
    if (currentQuestion.value?.id) {
      questionTimeSpent.value[currentQuestion.value.id] = currentQuestionTime.value;
    }

    currentQuestionIndex.value = index;
    startQuestionTimer();
  }
};

const submitExam = async () => {
  try {
    showSubmitConfirmation.value = false;
    isLoading.value = true;

    stopTimers();

    // Calculate total time spent
    const totalTimeSpent = (props.timeLimit * 60) - timeRemaining.value;

    // Submit to exam store
    const results = await examStore.submitExam({
      sessionId: sessionId.value,
      answers: examAnswers.value,
      timeSpent: totalTimeSpent,
      metadata: {
        flaggedQuestions: Array.from(flaggedQuestions.value),
        answerTimestamps: answerTimestamps.value,
        questionTimeSpent: questionTimeSpent.value,
        suspiciousActivity: suspiciousActivity.value,
        attemptNumber: attemptNumber.value
      }
    });

    examResults.value = results;
    simulationState.value = 'results';

    logUserAction('exam_submitted', { 
      score: results.score, 
      passed: results.passed,
      timeSpent: totalTimeSpent
    });

    announceToScreenReader(`Exam submitted. Score: ${results.score}%. ${results.passed ? 'Passed' : 'Failed'}`);

  } catch (err) {
    submissionError.value = err instanceof Error ? err.message : 'Failed to submit exam';
    console.error('Exam submission failed:', err);
  } finally {
    isLoading.value = false;
  }
};

const submitExamAutomatically = () => {
  simulationState.value = 'timeUp';
  announceToScreenReader('Time expired. Exam will be submitted automatically.');
  
  setTimeout(() => {
    submitExam();
  }, 2000);
};

const retrySubmission = () => {
  submissionError.value = null;
  submitExam();
};

const retryExam = () => {
  // Reset all state
  examAnswers.value = {};
  answerTimestamps.value = {};
  flaggedQuestions.value = new Set();
  questionTimeSpent.value = {};
  currentQuestionIndex.value = 0;
  timeRemaining.value = props.timeLimit * 60;
  examResults.value = null;
  submissionError.value = null;
  suspiciousActivity.value = [];
  
  attemptNumber.value++;
  simulationState.value = 'instructions';
  
  announceToScreenReader(`Starting attempt ${attemptNumber.value}`);
};

const enterReviewMode = () => {
  simulationState.value = 'review';
  currentQuestionIndex.value = 0;
  showOnlyIncorrect.value = false;
  
  announceToScreenReader('Entering review mode');
};

// Security functions
const setupSecurityMonitoring = () => {
  // Tab/window focus detection
  window.addEventListener('blur', () => {
    if (simulationState.value === 'active') {
      showTabWarning.value = true;
      handleSuspiciousActivity('tab_change');
    }
  });

  // Developer tools detection (basic)
  const detectDevtools = () => {
    if (window.outerHeight - window.innerHeight > 160 || window.outerWidth - window.innerWidth > 160) {
      if (simulationState.value === 'active') {
        showDevtoolsWarning.value = true;
        handleSuspiciousActivity('devtools');
      }
    }
  };

  setInterval(detectDevtools, 1000);

  // Prevent right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Keyboard shortcuts prevention
  document.addEventListener('keydown', (e) => {
    // Prevent F12, Ctrl+Shift+I, Ctrl+U, etc.
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.key === 'U') ||
      (e.ctrlKey && e.shiftKey && e.key === 'C')
    ) {
      e.preventDefault();
      handleSuspiciousActivity('keyboard_shortcut', { key: e.key });
    }
  });
};

const handleSuspiciousActivity = (type: string, data?: any) => {
  suspiciousActivity.value.push({
    type,
    timestamp: Date.now(),
    data
  });

  logUserAction('suspicious_activity', { type, data });
};

const dismissTabWarning = () => {
  showTabWarning.value = false;
};

// Utility functions
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const logUserAction = (action: string, data: any) => {
  // In a real implementation, this would send to analytics service
  console.log(`[${sessionId.value}] ${action}:`, data);
};

const announceToScreenReader = (message: string) => {
  screenReaderMessage.value = message;
  setTimeout(() => {
    screenReaderMessage.value = '';
  }, 1000);
};

// Results analysis functions
const isAnswerCorrect = (questionId: string): boolean => {
  const question = questions.value.find(q => q.id === questionId);
  if (!question || !examAnswers.value[questionId]) return false;

  const correctOptions = question.answerOptions?.filter(opt => opt.isCorrect).map(opt => opt.id) || [];
  const selectedOptions = examAnswers.value[questionId];

  if (question.type === 'single') {
    return selectedOptions.length === 1 && correctOptions.includes(selectedOptions[0]);
  } else if (question.type === 'multiple') {
    return selectedOptions.length === correctOptions.length &&
           selectedOptions.every(id => correctOptions.includes(id)) &&
           correctOptions.every(id => selectedOptions.includes(id));
  }

  return false;
};

const getQuestionStatus = (questionId: string): string => {
  if (!examAnswers.value[questionId]) return 'Unanswered';
  return isAnswerCorrect(questionId) ? 'Correct' : 'Incorrect';
};

const getAnswerFeedback = (): string => {
  if (isCurrentAnswerCorrect.value) {
    return 'Great job! You selected the correct answer.';
  } else {
    const questionId = currentQuestion.value?.id;
    if (questionId && !examAnswers.value[questionId]) {
      return 'This question was not answered.';
    }
    return 'This answer is incorrect. Review the explanation to understand the correct approach.';
  }
};

const calculatePercentile = (): number => {
  // Mock calculation - in real app would use actual distribution data
  const score = examResults.value?.score || 0;
  return Math.min(95, Math.max(5, Math.round(score * 0.9 + Math.random() * 10)));
};

const formatObjectiveName = (objectiveId: string): string => {
  // Convert objective ID to readable name
  return objectiveId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getObjectiveWeight = (objectiveId: string): number => {
  // Mock - in real app would get from exam configuration
  const weights: Record<string, number> = {
    'routing-fundamentals': 25,
    'network-fundamentals': 20,
    'infrastructure-services': 15,
    'security-fundamentals': 25,
    'automation-programmability': 15
  };
  return weights[objectiveId] || 10;
};

const getPerformanceLabel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  return 'Needs Work';
};

const getStudyRecommendations = (): string => {
  if (!examResults.value?.breakdown) {
    return 'Complete more practice to get personalized study recommendations.';
  }

  const weakAreas = Object.entries(examResults.value.breakdown)
    .filter(([, score]: [string, any]) => score < props.passingScore)
    .map(([area]) => formatObjectiveName(area));

  if (weakAreas.length === 0) {
    return 'Excellent performance across all areas! Consider taking advanced practice exams.';
  }

  return `Focus your studies on: ${weakAreas.join(', ')}. These areas scored below the passing threshold.`;
};

// Certificate generation
const generateCertificate = () => {
  try {
    certificateData.value = {
      examName: examName.value,
      examCode: examCode.value,
      score: examResults.value.score,
      passingScore: props.passingScore,
      dateCompleted: new Date().toLocaleDateString(),
      candidateName: 'Test Candidate', // Would get from user profile
      certificateId: `CERT-${sessionId.value}`
    };

    const pdf = new jsPDF();
    
    // Certificate header
    pdf.setFontSize(24);
    pdf.text('Certificate of Achievement', 105, 50, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.text('This certifies that', 105, 80, { align: 'center' });
    
    pdf.setFontSize(20);
    pdf.text(certificateData.value.candidateName, 105, 100, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.text('has successfully completed', 105, 120, { align: 'center' });
    
    pdf.setFontSize(18);
    pdf.text(certificateData.value.examName, 105, 140, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.text(`Score: ${certificateData.value.score}% (Required: ${certificateData.value.passingScore}%)`, 105, 160, { align: 'center' });
    pdf.text(`Date: ${certificateData.value.dateCompleted}`, 105, 180, { align: 'center' });
    pdf.text(`Certificate ID: ${certificateData.value.certificateId}`, 105, 200, { align: 'center' });

    pdf.save(`certificate-${examCode.value}-${certificateData.value.dateCompleted}.pdf`);

    announceToScreenReader('Certificate generated and downloaded');
  } catch (err) {
    console.error('Certificate generation failed:', err);
  }
};

// Keyboard shortcuts
const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (simulationState.value !== 'active') return;

  const key = event.key.toLowerCase();
  
  switch (key) {
    case '1':
    case '2':
    case '3':
    case '4':
      if (currentQuestion.value?.answerOptions) {
        const optionIndex = parseInt(key) - 1;
        const option = currentQuestion.value.answerOptions[optionIndex];
        if (option) {
          event.preventDefault();
          selectAnswer(option.id);
        }
      }
      break;
    case 'f':
      event.preventDefault();
      toggleQuestionFlag();
      break;
    case 'n':
      if (!isLastQuestion.value) {
        event.preventDefault();
        nextQuestion();
      }
      break;
    case 's':
      if (isLastQuestion.value) {
        event.preventDefault();
        showSubmitConfirmation.value = true;
      }
      break;
  }
};

// Lifecycle hooks
onMounted(async () => {
  // Mobile detection
  isMobile.value = window.innerWidth < 768;
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768;
  });

  // Online/offline detection
  window.addEventListener('online', () => { isOffline.value = false; });
  window.addEventListener('offline', () => { isOffline.value = true; });

  // Initialize exam
  await initializeExamSimulation();
});

onUnmounted(() => {
  stopTimers();
  
  // Clean up event listeners
  window.removeEventListener('blur', () => {});
  
  // Exit fullscreen
  if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
});

// Expose for testing
defineExpose({
  isLoading,
  error,
  simulationState,
  examAnswers,
  answerTimestamps,
  flaggedQuestions,
  questionTimeSpent,
  timeRemaining,
  currentQuestionIndex,
  questions,
  examResults,
  certificateData,
  suspiciousActivity,
  attemptNumber,
  isOffline,
  isMobile,
  showTabWarning,
  showDevtoolsWarning,
  submissionError,
  agreedToRules,
  showSubmitConfirmation,
  unansweredCount,
  answeredCount,
  isAnswerSelected,
  selectAnswer,
  saveAnswer,
  nextQuestion,
  skipQuestion,
  goToQuestion,
  toggleQuestionFlag,
  submitExam,
  submitExamAutomatically,
  retrySubmission,
  retryExam,
  enterReviewMode,
  startExamSimulation,
  shuffleQuestions,
  shuffleAnswerOptions,
  handleSuspiciousActivity,
  logUserAction,
  generateCertificate,
  isAnswerCorrect,
  getQuestionStatus,
  calculatePercentile,
  formatObjectiveName,
  getObjectiveWeight,
  getPerformanceLabel,
  getStudyRecommendations,
  formatTime,
  dismissTabWarning,
  debouncedSaveAnswer: saveAnswer
});
</script>

<style scoped>
.test-simulation {
  font-family: 'Inter', system-ui, sans-serif;
}

.mobile-layout {
  padding-left: 0.5rem; padding-right: 0.5rem;
}

.exam-mode {
  border: 2px solid #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.exam-mode.disabled {
  opacity: 0.5; pointer-events: none;
}

.mobile-timer {
  font-size: 1rem; padding: 0.25rem 0.75rem;
}

.touch-target {
  min-height: 48px;
  min-width: 48px;
}

.user-selected {
  border: 2px solid #3b82f6;
}

.correct {
  background-color: rgb(240 253 244); border-color: rgb(134 239 172);
}

.incorrect {
  background-color: rgb(254 242 242); border-color: rgb(252 165 165);
}

.time-warning {
  animation: pulse 2s infinite;
}

.critical-alert {
  animation: pulse 1s infinite;
}

.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

/* Prevent text selection in exam mode */
.exam-environment {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Allow text selection in review mode */
.test-simulation[data-state="review"] {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

/* Print styles for certificate */
@media print {
  .test-simulation {
    background-color: white;
  }
  
  .exam-environment,
  button,
  .timer {
    display: none !important;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .exam-mode {
    border: 3px solid #000;
  }
  
  .bg-gradient-to-r {
    background-color: rgb(37 99 235);
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .transition-all,
  .transition-colors,
  .animate-pulse {
    transition: none;
    animation: none;
  }
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus management */
.test-simulation:focus-within {
  outline: none;
}

/* Virtual list for large question sets */
.virtualized-question-list {
  height: 400px;
  overflow-y: auto;
}

/* Anti-cheat styles */
.test-simulation * {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.test-simulation input[type="radio"],
.test-simulation input[type="checkbox"] {
  -webkit-user-select: auto;
  -moz-user-select: auto;
  -ms-user-select: auto;
  user-select: auto;
}
</style>