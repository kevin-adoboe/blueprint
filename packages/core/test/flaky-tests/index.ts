/*
 * Copyright 2024 Palantir Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * INTENTIONALLY FLAKY TESTS FOR CIRCLECI FLAKY TEST DETECTION
 * 
 * These tests are designed to fail approximately 30% of the time to test
 * CircleCI's flaky test detection capabilities. They simulate real-world
 * issues that cause test flakiness:
 * 
 * - Race conditions and timing issues
 * - Async operations with variable delays
 * - Network simulation with random failures
 * - DOM updates and animation timing
 * - Focus management and event propagation
 * - Viewport changes and positioning calculations
 * 
 * DO NOT USE THESE PATTERNS IN PRODUCTION TESTS
 */

// Import all flaky test files to ensure they're included in the test run
import "./flakyButtonTests";
import "./flakyTooltipTests";
import "./flakyDialogTests";
import "./flakyFormTests";
