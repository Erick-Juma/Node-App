--
-- PostgreSQL database dump
--

\restrict BYMDY5YOJMPPlR2XNdWyb6QmcHNRm6dbIgeTigmvDmskr8zOqHhFZN1AfNT1EJ1

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: knowledge_articles; Type: TABLE DATA; Schema: public; Owner: raguser
--

COPY public.knowledge_articles (id, source_url, title, project, fetched_at, content_hash, topic) FROM stdin;
4	laravel-article-2	How do I find my enrolled courses?	aki	2026-10-09 13:11:50.514661+03	6490d6f13e7b6174241f47b1d15158f4076437506f853dd9d1d09e99ecdf1dc1	2
5	laravel-article-3	What happens after I enroll in a course?	aki	2026-10-09 13:58:59.530379+03	806feee1c166b08ab7fcc5be89c6c8be32e944b5b63d351da8d20a6a40cba864	2
6	laravel-article-4	Why can't I enroll in a course?	aki	2026-10-09 14:10:20.574433+03	88f602b6dfe00fd0f4667a8c1ac14e2b572e30b7d0e6211c6c33ee9bbf614cbf	2
3	laravel-article-1	How do I enroll in a course?	aki	2026-10-09 12:08:28.563227+03	943e9da824b2eeec12049e6a232f497ee892ec0f46eea22a286360c7b8eca123	2
7	laravel-article-5	What happens when all licenses for a course have been used or have expired?	aki	2026-10-09 14:25:11.79004+03	b4fc39bdbc0a33ff70749c31ba8453ccd86d63e57f16eec0b30b28d9581cd792	2
8	laravel-article-6	Is there a limit to the number of courses I can enroll in?	aki	2026-10-09 14:26:52.261484+03	4ffd97b84b7c0059142d427a1397d78772d771de9d9220ba4da9ea9cd6f9af4e	2
9	laravel-article-7	What is a course enrollment end date?	aki	2026-10-09 14:28:04.880992+03	b198918c759bb8da0e612a73fa8db5eadf746374e6437c5f7878f5abe14ae85b	2
10	laravel-article-8	Can I enroll in a course after the enrollment end date?	aki	2026-10-09 14:29:51.099805+03	86283c3434d9045a99b9d76abff1cea9bd0f17f65e8c6a148ed4a6c8d1f31aa8	2
11	laravel-article-9	What is the Training Calendar	aki	2026-10-09 14:31:09.781176+03	d487d5fbbdfadd7264c204f24b6de4b4bd8f8a0ae80cb27278b931fa564930c2	2
12	laravel-article-10	What happens if I miss the Training Calendar due date?	aki	2026-10-09 14:32:46.912789+03	7e0a6dda312d18859c5950a60db5da7f9c1cab21469f376eca673d5ef69fc7b6	2
13	laravel-article-11	Is the Training Calendar due date the same as the course enrollment end date?	aki	2026-10-09 14:33:44.257385+03	3957f92ffdddba08570972d8cce8a6d41e79b5507d695744210e41f07d8b5559	2
15	laravel-article-13	How do I continue a course I have already started?	aki	2026-10-09 15:32:43.955543+03	a8a89c0d1de46c5e5b2bf10cefb162fa7efde52d42d594f55d5a48fdee1e02ff	1
16	laravel-article-14	What is the pass mark for a gradeable course?	aki	2026-10-09 15:39:00.381905+03	6f56a523268874548ebfbe977609841f431c7471df48fee588e882606f02a690	3
17	laravel-article-15	What happens if I score below or above the pass mark?	aki	2026-10-09 15:40:43.975031+03	7497b18bb351e11b6ae377152f3ca591dac75023cf8fdba19b8afb51fbc16704	3
18	laravel-article-16	How many times can I retake a quiz?	aki	2026-10-09 15:42:09.53865+03	4ca5ef95e062a31b5beed47a72bffaa1bf680d055f1a3587388d6fa6c2313bd2	3
19	laravel-article-17	Can I review or change my answers after taking a quiz?	aki	2026-10-09 15:43:06.071298+03	2b47010c70cec305d0f32842c92adf5f81e5f5cdace6e4babe22f2007bd57a1c	3
21	laravel-article-19	How do I complete a non-gradeable course?	aki	2026-10-09 15:46:03.754118+03	f677bbff15f51e8efc0fab5f31403bb54cbaf63d46f3c7c7c92e3999cfdc2a8e	3
22	laravel-article-18	Why is my quiz score not updating after I submit?	aki	2026-10-09 15:47:47.667087+03	c1c5bd8775ac288c030188e225689ce34812074c8115b17759741c572b2c3187	3
23	laravel-article-20	Why can't I move on to the next section?	aki	2026-10-09 15:51:43.565131+03	6b8fcf6ae73fc88c8d6b72aab5f9fc647dccb9dac3e2da9da2c6e2bdea8f1df1	3
24	laravel-article-21	Why is my course still showing as In Progress?	aki	2026-10-09 15:57:04.032391+03	00c205950aa37eaa9d84bf2af0371aabe5be2ddd0b0d225b2e436cdb4160e015	3
25	laravel-article-22	How do I download my certificate for a course I've completed?	aki	2026-10-09 16:11:46.913775+03	4112814e4a855f1f20d9d8842652f8b8f2462c04ad27ce936a9cac73288574ef	4
26	laravel-article-23	Why can't I download my course certificate?	aki	2026-10-09 16:12:53.107102+03	4940ff1d713835f7bae70ca8a85ef1aa3c2d6133a45f92b0a866019a0c660678	4
27	laravel-article-24	How do I qualify for the overall certificate for my mandatory modules?	aki	2026-10-09 16:14:03.547034+03	1b763a6d129308306f937bf123348373fcd966ac59648a6e6bbed40fd9652089	4
28	laravel-article-25	Where can I find my overall certificate?	aki	2026-10-09 16:20:02.972224+03	91d73a97ccea6732a1b48cc8709a8c2dca31ae5b918c62b665f0301e9cb0189d	4
29	laravel-article-26	What is the difference between a course certificate and the overall certificate?	aki	2026-10-09 16:21:03.596193+03	d622f0b3f09d67626ed71a6c75a8668d24983244b03e3e1ea94c0f05587305d3	4
30	laravel-article-27	What are mandatory courses?	aki	2026-10-09 16:25:00.967119+03	769f5a7554b1b6a7293ba0e0e380433eefbac6594047984e91b1953e52f9c676	5
31	laravel-article-28	How do I find my mandatory courses?	aki	2026-10-09 16:26:11.133871+03	01667b8197a9ff2c19505db0ba2e7ec2a37bfbc5f3053d654b8df0a37487c8a7	5
32	laravel-article-29	How do I download my progress report?	aki	2026-10-09 16:44:45.589837+03	0854cad0f2392e44abca73a96e9b2148ae895ed2ad7400ac67f58b41623663d1	1
33	laravel-article-30	How are my suggested courses chosen?	aki	2026-10-09 16:45:42.838812+03	005e22cf008bc90c659b60d0caf967d3b1b0a0d264d87cd2006f2e4825764795	1
34	laravel-article-12	What do the course statuses mean?	aki	2026-10-09 16:47:25.798916+03	37c4bf3a8376c27673018967d8d26e60273d4751f6a9cfc888417a8be02235a1	1
35	laravel-article-31	How do I edit my profile?	aki	2026-10-09 16:53:41.661454+03	a0e24ff0260428e0fe941166f9d3a6e896ee2d0ddbb098cc4852e294a968ffbf	1
36	laravel-article-32	How do I choose which emails I receive?	aki	2026-10-09 16:54:41.498181+03	955f9e443da6814fc5ee980d98824719e8aeae3da61997b859e26792c8af012b	1
37	laravel-article-33	How do I access the HR Dashboard?	aki	2026-10-09 16:59:51.076978+03	29e8ebb88e88b0e24864eef20fa18e0aa44721df22a5e1906b32aab47f93c9a3	1
\.


--
-- Name: knowledge_articles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: raguser
--

SELECT pg_catalog.setval('public.knowledge_articles_id_seq', 37, true);


--
-- PostgreSQL database dump complete
--

\unrestrict BYMDY5YOJMPPlR2XNdWyb6QmcHNRm6dbIgeTigmvDmskr8zOqHhFZN1AfNT1EJ1

