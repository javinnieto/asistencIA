-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: db
-- Tiempo de generación: 04-09-2025 a las 14:16:38
-- Versión del servidor: 8.0.43
-- Versión de PHP: 8.2.27

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `asistencias`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias_asistencia`
--

CREATE TABLE `asistencias_asistencia` (
  `idAsistencia` int NOT NULL,
  `fechaHora` datetime(6) NOT NULL,
  `temperatura` double NOT NULL,
  `estado_id` int NOT NULL,
  `institucion_id` int DEFAULT NULL,
  `persona_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `asistencias_asistencia`
--

INSERT INTO `asistencias_asistencia` (`idAsistencia`, `fechaHora`, `temperatura`, `estado_id`, `institucion_id`, `persona_id`) VALUES
(1, '2025-09-03 08:10:31.084596', 37, 3, 1, 11),
(2, '2025-09-03 07:36:02.084596', 36.8, 1, 2, 50),
(3, '2025-09-03 07:05:42.084596', 36.9, 1, 1, 3),
(4, '2025-09-03 07:07:10.084596', 37.4, 3, 1, 4),
(5, '2025-09-03 07:14:54.084596', 37.1, 1, 1, 10),
(6, '2025-09-03 08:16:41.084596', 37.1, 1, 1, 1),
(7, '2025-09-03 07:56:57.084596', 36.5, 3, 2, 41),
(8, '2025-09-03 08:29:57.084596', 36.3, 1, 1, 20),
(9, '2025-09-03 07:01:47.084596', 36.4, 1, 1, 2),
(10, '2025-09-03 07:51:00.084596', 36.1, 3, 1, 30),
(11, '2025-09-03 07:39:56.084596', 36.7, 1, 2, 40),
(12, '2025-09-02 08:28:12.234130', 36.5, 1, 1, 4),
(13, '2025-09-02 08:19:09.234130', 37.2, 1, 1, 30),
(14, '2025-09-02 08:24:30.234130', 36, 1, 1, 11),
(15, '2025-09-02 08:03:46.234130', 36.1, 3, 1, 1),
(16, '2025-09-02 07:29:17.234130', 36.5, 1, 2, 41),
(17, '2025-09-02 07:35:02.234130', 37.3, 3, 1, 3),
(18, '2025-09-02 07:23:31.234130', 36.6, 1, 2, 51),
(19, '2025-09-02 07:10:14.234130', 37.5, 3, 1, 10),
(20, '2025-09-02 07:18:23.234130', 37.4, 3, 1, 20),
(21, '2025-09-02 07:21:22.234130', 36.2, 3, 1, 5),
(22, '2025-09-02 07:40:17.234130', 36.8, 3, 2, 47),
(23, '2025-09-01 07:12:58.387916', 36.2, 1, 1, 20),
(24, '2025-09-01 08:19:11.387916', 36.1, 1, 1, 1),
(25, '2025-09-01 07:29:53.387916', 36.4, 3, 2, 47),
(26, '2025-09-01 07:55:07.387916', 37.3, 1, 1, 3),
(27, '2025-09-01 07:50:25.387916', 37.4, 1, 1, 30),
(28, '2025-09-01 07:18:09.387916', 36.2, 3, 2, 51),
(29, '2025-09-01 08:17:41.387916', 36.8, 1, 1, 2),
(30, '2025-09-01 08:30:19.387916', 36.9, 3, 2, 40),
(31, '2025-09-01 07:45:49.387916', 36.8, 3, 2, 50),
(32, '2025-09-01 07:50:32.387916', 36.2, 1, 1, 5),
(33, '2025-09-01 07:10:31.387916', 36.5, 3, 2, 41),
(34, '2025-08-31 07:01:25.543186', 36.8, 1, 1, 1),
(35, '2025-08-31 07:25:25.543186', 37.4, 3, 2, 40),
(36, '2025-08-31 07:33:14.543186', 36, 3, 2, 47),
(37, '2025-08-31 08:18:55.543186', 36.3, 3, 1, 2),
(38, '2025-08-31 08:05:32.543186', 36.1, 3, 2, 50),
(39, '2025-08-31 07:12:26.543186', 36.6, 3, 1, 30),
(40, '2025-08-31 07:25:51.543186', 36.8, 3, 1, 3),
(41, '2025-08-31 07:37:55.543186', 37.4, 1, 1, 4),
(42, '2025-08-31 07:48:24.543186', 36.9, 3, 1, 10),
(43, '2025-08-31 07:42:50.543186', 36.6, 1, 1, 5),
(44, '2025-08-31 08:06:38.543186', 36.2, 3, 2, 41),
(45, '2025-08-30 08:11:21.676372', 36.1, 1, 1, 11),
(46, '2025-08-30 07:16:01.676372', 36.6, 3, 1, 3),
(47, '2025-08-30 07:32:53.676372', 37, 1, 1, 30),
(48, '2025-08-30 07:35:05.676372', 36.6, 1, 1, 2),
(49, '2025-08-30 08:19:11.676372', 36.3, 1, 2, 40),
(50, '2025-08-30 07:20:30.676372', 37.2, 1, 1, 10),
(51, '2025-08-30 07:09:18.676372', 36.9, 1, 1, 1),
(52, '2025-08-30 08:28:20.676372', 36.7, 1, 2, 41),
(53, '2025-08-30 08:05:30.676372', 37, 1, 1, 5),
(54, '2025-08-30 08:16:53.676372', 37.4, 1, 2, 51),
(55, '2025-08-30 08:07:09.676372', 36.4, 1, 1, 20),
(56, '2025-08-29 07:32:26.820880', 36.4, 1, 2, 41),
(57, '2025-08-29 08:01:37.820880', 37, 1, 1, 20),
(58, '2025-08-29 07:59:25.820880', 36.9, 1, 1, 2),
(59, '2025-08-29 07:05:26.820880', 36.3, 1, 1, 4),
(60, '2025-08-29 07:11:14.820880', 36.4, 3, 1, 10),
(61, '2025-08-29 07:40:43.820880', 36.2, 3, 2, 50),
(62, '2025-08-29 07:28:12.820880', 36.4, 1, 1, 30),
(63, '2025-08-29 08:06:27.820880', 36.9, 3, 2, 51),
(64, '2025-08-29 07:57:46.820880', 36.4, 3, 2, 40),
(65, '2025-08-29 07:09:03.820880', 36.2, 3, 1, 11),
(66, '2025-08-29 07:27:42.820880', 36.4, 3, 1, 3),
(67, '2025-08-28 08:05:29.995019', 36.5, 3, 1, 3),
(68, '2025-08-28 07:18:15.995019', 37.1, 1, 1, 4),
(69, '2025-08-28 07:42:33.995019', 37.4, 1, 1, 2),
(70, '2025-08-28 07:38:44.995019', 37, 1, 2, 47),
(71, '2025-08-28 07:56:33.995019', 36, 3, 1, 30),
(72, '2025-08-28 07:31:50.995019', 37.3, 1, 1, 10),
(73, '2025-08-28 08:18:06.995019', 37.5, 1, 1, 1),
(74, '2025-08-28 07:07:07.995019', 36.3, 1, 2, 51),
(75, '2025-08-28 08:04:03.995019', 36.2, 3, 2, 50),
(76, '2025-08-28 07:40:13.995019', 36.5, 3, 2, 40),
(77, '2025-08-28 08:10:56.995019', 37.1, 1, 1, 11),
(78, '2025-08-27 07:09:04.136090', 37.4, 3, 2, 47),
(79, '2025-08-27 07:21:24.136090', 37.4, 3, 2, 51),
(80, '2025-08-27 07:20:04.136090', 36.3, 1, 1, 1),
(81, '2025-08-27 08:09:47.136090', 37.4, 1, 2, 41),
(82, '2025-08-27 07:45:38.136090', 36.4, 1, 1, 20),
(83, '2025-08-27 08:14:45.136090', 36.1, 1, 2, 40),
(84, '2025-08-27 07:08:26.136090', 37.3, 3, 1, 2),
(85, '2025-08-27 07:35:20.136090', 36.1, 3, 2, 50),
(86, '2025-08-27 07:50:04.136090', 37.5, 1, 1, 4),
(87, '2025-08-27 07:05:16.136090', 36.3, 3, 1, 3),
(88, '2025-08-27 08:07:56.136090', 37.3, 1, 1, 11),
(89, '2025-08-26 08:19:01.327620', 36.5, 3, 1, 11),
(90, '2025-08-26 07:11:28.327620', 37.4, 1, 1, 10),
(91, '2025-08-26 07:30:04.327620', 36.2, 3, 2, 40),
(92, '2025-08-26 07:37:26.327620', 36.9, 3, 2, 47),
(93, '2025-08-26 08:22:41.327620', 37.3, 1, 1, 5),
(94, '2025-08-26 07:59:30.327620', 37.2, 3, 1, 1),
(95, '2025-08-26 08:02:16.327620', 36.1, 1, 1, 2),
(96, '2025-08-26 07:07:54.327620', 36.8, 1, 1, 4),
(97, '2025-08-26 07:43:56.327620', 37.1, 3, 1, 20),
(98, '2025-08-26 08:15:50.327620', 36.6, 1, 2, 51),
(99, '2025-08-26 08:23:34.327620', 36, 1, 1, 30),
(100, '2025-08-25 07:03:56.459009', 36.2, 3, 1, 10),
(101, '2025-08-25 08:08:20.459009', 37.2, 3, 1, 1),
(102, '2025-08-25 07:06:22.459009', 37.1, 3, 1, 4),
(103, '2025-08-25 07:25:39.459009', 37, 1, 2, 41),
(104, '2025-08-25 07:45:19.459009', 37, 3, 1, 5),
(105, '2025-08-25 07:25:53.459009', 37.3, 1, 2, 50),
(106, '2025-08-25 07:45:55.459009', 36.2, 1, 2, 47),
(107, '2025-08-25 08:21:41.459009', 37.5, 3, 1, 11),
(108, '2025-08-25 07:29:23.459009', 37.1, 3, 1, 30),
(109, '2025-08-25 07:31:22.459009', 37, 3, 2, 51),
(110, '2025-08-25 07:41:39.459009', 36.9, 1, 2, 40),
(111, '2025-08-24 08:10:27.594180', 37, 1, 2, 40),
(112, '2025-08-24 07:33:47.594180', 36.1, 3, 1, 2),
(113, '2025-08-24 08:01:40.594180', 36.2, 3, 2, 47),
(114, '2025-08-24 08:30:58.594180', 36.1, 3, 1, 5),
(115, '2025-08-24 07:24:23.594180', 37.4, 3, 2, 41),
(116, '2025-08-24 07:28:58.594180', 37.2, 1, 1, 20),
(117, '2025-08-24 07:50:31.594180', 36.9, 3, 1, 10),
(118, '2025-08-24 07:14:29.594180', 36.9, 3, 1, 4),
(119, '2025-08-24 08:03:53.594180', 36.2, 1, 1, 30),
(120, '2025-08-24 07:38:57.594180', 36.8, 3, 2, 50),
(121, '2025-08-24 07:47:27.594180', 37.3, 3, 1, 11),
(122, '2025-08-23 07:27:13.751177', 37.5, 1, 2, 47),
(123, '2025-08-23 08:25:16.751177', 36.2, 1, 2, 51),
(124, '2025-08-23 08:23:27.751177', 36.6, 1, 1, 11),
(125, '2025-08-23 07:11:55.751177', 36.3, 1, 1, 3),
(126, '2025-08-23 07:55:41.751177', 37.4, 1, 1, 30),
(127, '2025-08-23 07:38:37.751177', 37.4, 3, 2, 50),
(128, '2025-08-23 07:17:42.751177', 37, 1, 1, 4),
(129, '2025-08-23 07:16:12.751177', 36.3, 3, 1, 2),
(130, '2025-08-23 07:08:15.751177', 36.4, 1, 1, 20),
(131, '2025-08-23 07:57:55.751177', 36.7, 1, 1, 10),
(132, '2025-08-23 08:00:33.751177', 37.5, 1, 2, 40),
(133, '2025-08-22 07:40:00.892108', 36.4, 3, 1, 3),
(134, '2025-08-22 08:29:23.892108', 36.3, 3, 2, 41),
(135, '2025-08-22 08:01:16.892108', 36.5, 1, 1, 2),
(136, '2025-08-22 07:41:51.892108', 37.5, 3, 1, 11),
(137, '2025-08-22 07:02:12.892108', 37.3, 1, 1, 20),
(138, '2025-08-22 08:20:17.892108', 36.1, 3, 2, 51),
(139, '2025-08-22 07:18:57.892108', 36.6, 1, 1, 4),
(140, '2025-08-22 07:04:49.892108', 36.3, 3, 1, 1),
(141, '2025-08-22 07:27:05.892108', 36.1, 1, 2, 40),
(142, '2025-08-22 07:27:48.892108', 36.7, 1, 1, 5),
(143, '2025-08-22 07:55:51.892108', 37.4, 3, 2, 47),
(144, '2025-08-21 07:46:49.003866', 36.3, 3, 1, 1),
(145, '2025-08-21 07:52:20.003866', 36.3, 1, 2, 40),
(146, '2025-08-21 07:54:10.003866', 36.2, 1, 1, 3),
(147, '2025-08-21 08:04:28.003866', 37.5, 3, 2, 47),
(148, '2025-08-21 07:32:58.003866', 37.1, 3, 1, 5),
(149, '2025-08-21 07:16:57.003866', 36.3, 3, 1, 4),
(150, '2025-08-21 07:28:23.003866', 36.9, 3, 1, 20),
(151, '2025-08-21 08:20:02.003866', 37.2, 3, 1, 30),
(152, '2025-08-21 07:11:26.003866', 37.1, 1, 1, 10),
(153, '2025-08-21 07:49:59.003866', 36.4, 3, 2, 50),
(154, '2025-08-21 07:10:48.003866', 37.1, 1, 1, 11),
(155, '2025-08-20 08:19:01.135768', 36.6, 1, 1, 11),
(156, '2025-08-20 07:33:12.135768', 36.7, 1, 1, 2),
(157, '2025-08-20 07:27:23.135768', 36.8, 3, 1, 5),
(158, '2025-08-20 07:03:27.135768', 36.8, 1, 1, 20),
(159, '2025-08-20 07:11:49.135768', 37, 1, 2, 40),
(160, '2025-08-20 07:13:04.135768', 37, 3, 1, 3),
(161, '2025-08-20 08:26:16.135768', 36, 3, 2, 47),
(162, '2025-08-20 07:04:14.135768', 36.7, 3, 1, 30),
(163, '2025-08-20 07:25:17.135768', 36.2, 3, 1, 10),
(164, '2025-08-20 07:51:23.135768', 36.7, 3, 2, 41),
(165, '2025-08-20 08:14:20.135768', 37.1, 3, 1, 1),
(166, '2025-08-19 08:19:13.270556', 36.1, 3, 1, 30),
(167, '2025-08-19 07:38:41.270556', 36.6, 3, 2, 40),
(168, '2025-08-19 07:03:04.270556', 36.7, 3, 1, 2),
(169, '2025-08-19 07:51:52.270556', 36.6, 1, 1, 10),
(170, '2025-08-19 07:04:19.270556', 36.4, 1, 2, 51),
(171, '2025-08-19 08:26:34.270556', 36.6, 3, 1, 3),
(172, '2025-08-19 07:57:42.270556', 37.2, 3, 2, 41),
(173, '2025-08-19 07:54:13.270556', 37.3, 3, 2, 47),
(174, '2025-08-19 07:32:55.270556', 37.2, 1, 1, 4),
(175, '2025-08-19 08:06:42.270556', 37.3, 1, 1, 20),
(176, '2025-08-19 07:32:46.270556', 36.4, 1, 1, 11),
(177, '2025-08-18 07:07:17.428533', 36.1, 1, 1, 4),
(178, '2025-08-18 08:14:30.428533', 36.5, 3, 1, 1),
(179, '2025-08-18 08:15:11.428533', 37.3, 3, 2, 41),
(180, '2025-08-18 07:11:51.428533', 37.5, 1, 2, 50),
(181, '2025-08-18 07:19:10.428533', 36.6, 1, 2, 47),
(182, '2025-08-18 07:16:59.428533', 36.8, 1, 1, 11),
(183, '2025-08-18 08:19:32.428533', 36.2, 3, 1, 5),
(184, '2025-08-18 08:20:50.428533', 36.3, 3, 1, 20),
(185, '2025-08-18 07:54:39.428533', 36.2, 1, 1, 10),
(186, '2025-08-18 07:31:30.428533', 36.3, 3, 2, 40),
(187, '2025-08-18 07:18:13.428533', 36.9, 1, 1, 30),
(188, '2025-08-17 08:06:55.562111', 37.4, 3, 1, 30),
(189, '2025-08-17 07:17:08.562111', 37.4, 3, 1, 20),
(190, '2025-08-17 07:15:52.562111', 36.5, 3, 2, 51),
(191, '2025-08-17 08:03:21.562111', 37.3, 1, 1, 5),
(192, '2025-08-17 07:12:11.562111', 36.6, 3, 2, 47),
(193, '2025-08-17 08:23:54.562111', 36.4, 3, 1, 3),
(194, '2025-08-17 08:03:40.562111', 36.2, 1, 2, 40),
(195, '2025-08-17 08:28:17.562111', 36.2, 1, 1, 2),
(196, '2025-08-17 08:10:04.562111', 36.7, 3, 2, 50),
(197, '2025-08-17 08:20:27.562111', 37.4, 1, 1, 11),
(198, '2025-08-17 07:46:13.562111', 36.3, 3, 2, 41),
(199, '2025-08-16 08:16:38.688199', 37.1, 3, 1, 3),
(200, '2025-08-16 08:11:57.688199', 37, 1, 2, 51),
(201, '2025-08-16 07:52:00.688199', 36.1, 3, 1, 5),
(202, '2025-08-16 07:02:58.688199', 37.2, 1, 1, 4),
(203, '2025-08-16 07:28:00.688199', 36.3, 1, 2, 50),
(204, '2025-08-16 08:09:25.688199', 37.5, 1, 1, 2),
(205, '2025-08-16 07:19:27.688199', 37.3, 3, 1, 30),
(206, '2025-08-16 07:26:53.688199', 37, 1, 1, 11),
(207, '2025-08-16 08:16:02.688199', 37.4, 1, 1, 1),
(208, '2025-08-16 07:57:21.688199', 36.1, 1, 2, 41),
(209, '2025-08-16 07:04:27.688199', 37.2, 3, 1, 10),
(210, '2025-08-15 07:21:41.847134', 37.3, 1, 2, 51),
(211, '2025-08-15 07:20:02.847134', 36.2, 1, 1, 20),
(212, '2025-08-15 07:41:02.847134', 36.4, 3, 1, 30),
(213, '2025-08-15 07:18:39.847134', 37.4, 3, 2, 41),
(214, '2025-08-15 07:19:51.847134', 37, 1, 2, 47),
(215, '2025-08-15 07:42:10.847134', 36, 3, 1, 10),
(216, '2025-08-15 07:20:56.847134', 36.7, 1, 1, 5),
(217, '2025-08-15 08:30:45.847134', 37, 3, 2, 50),
(218, '2025-08-15 07:54:48.847134', 36.9, 1, 1, 2),
(219, '2025-08-15 08:29:21.847134', 36.2, 1, 1, 4),
(220, '2025-08-15 07:36:12.847134', 36.7, 3, 1, 11),
(221, '2025-08-14 07:01:09.019466', 36.2, 3, 1, 3),
(222, '2025-08-14 07:47:34.019466', 36.3, 3, 2, 47),
(223, '2025-08-14 07:42:58.019466', 37.3, 3, 2, 41),
(224, '2025-08-14 07:52:47.019466', 36.1, 1, 1, 20),
(225, '2025-08-14 07:01:09.019466', 37, 1, 2, 50),
(226, '2025-08-14 08:19:17.019466', 37.4, 3, 1, 5),
(227, '2025-08-14 07:03:10.019466', 36.9, 3, 1, 10),
(228, '2025-08-14 08:03:32.019466', 37.4, 3, 1, 2),
(229, '2025-08-14 08:29:01.019466', 36.7, 1, 1, 1),
(230, '2025-08-14 08:11:41.019466', 37.2, 3, 2, 40),
(231, '2025-08-14 08:10:33.019466', 36.1, 3, 1, 30),
(232, '2025-08-13 07:41:24.147938', 37.4, 3, 2, 40),
(233, '2025-08-13 07:28:55.147938', 37.3, 1, 1, 4),
(234, '2025-08-13 07:59:18.147938', 36.4, 1, 2, 41),
(235, '2025-08-13 07:43:54.147938', 36.1, 3, 1, 3),
(236, '2025-08-13 07:17:24.147938', 36, 3, 1, 30),
(237, '2025-08-13 07:19:33.147938', 36.2, 1, 1, 10),
(238, '2025-08-13 07:24:00.147938', 36.8, 3, 2, 47),
(239, '2025-08-13 07:51:53.147938', 36.3, 1, 1, 5),
(240, '2025-08-13 07:29:09.147938', 36.4, 3, 2, 50),
(241, '2025-08-13 07:13:50.147938', 36, 1, 1, 11),
(242, '2025-08-13 07:55:17.147938', 36.7, 3, 2, 51),
(243, '2025-08-12 08:12:58.428117', 37.3, 1, 2, 47),
(244, '2025-08-12 08:20:29.428117', 37.1, 1, 2, 40),
(245, '2025-08-12 07:49:39.428117', 37, 3, 1, 2),
(246, '2025-08-12 07:12:11.428117', 37.4, 3, 1, 20),
(247, '2025-08-12 07:57:44.428117', 37, 1, 1, 3),
(248, '2025-08-12 08:16:47.428117', 36, 1, 2, 51),
(249, '2025-08-12 07:50:53.428117', 36, 1, 1, 30),
(250, '2025-08-12 08:08:56.428117', 36.7, 1, 2, 41),
(251, '2025-08-12 07:36:24.428117', 36.6, 3, 1, 5),
(252, '2025-08-12 07:24:16.428117', 37.4, 1, 1, 10),
(253, '2025-08-12 08:27:03.428117', 36.6, 3, 1, 11),
(254, '2025-08-11 07:11:34.540934', 36.6, 1, 2, 50),
(255, '2025-08-11 08:16:05.540934', 36.6, 1, 1, 1),
(256, '2025-08-11 07:09:30.540934', 37.3, 1, 2, 47),
(257, '2025-08-11 07:13:12.540934', 36.9, 3, 1, 11),
(258, '2025-08-11 07:53:33.540934', 36.7, 3, 1, 10),
(259, '2025-08-11 07:31:46.540934', 36.9, 1, 1, 2),
(260, '2025-08-11 07:06:47.540934', 37.1, 1, 2, 41),
(261, '2025-08-11 08:13:40.540934', 37.4, 3, 1, 5),
(262, '2025-08-11 07:58:20.540934', 36.7, 1, 1, 4),
(263, '2025-08-11 08:22:55.540934', 37.4, 1, 2, 51),
(264, '2025-08-11 07:27:49.540934', 37.2, 1, 1, 3),
(265, '2025-08-10 08:28:21.687923', 36.4, 1, 1, 11),
(266, '2025-08-10 08:10:10.687923', 36.3, 3, 2, 51),
(267, '2025-08-10 08:10:05.687923', 36.1, 1, 1, 2),
(268, '2025-08-10 08:04:36.687923', 36.2, 3, 2, 50),
(269, '2025-08-10 07:29:42.687923', 36, 1, 2, 47),
(270, '2025-08-10 07:50:18.687923', 36.3, 1, 2, 41),
(271, '2025-08-10 07:39:31.687923', 37.3, 3, 1, 5),
(272, '2025-08-10 07:28:03.687923', 36.6, 1, 1, 20),
(273, '2025-08-10 07:57:55.687923', 37.4, 1, 1, 1),
(274, '2025-08-10 07:28:09.687923', 36.8, 1, 1, 4),
(275, '2025-08-10 07:12:34.687923', 36.8, 1, 2, 40),
(276, '2025-08-09 07:46:56.853237', 37.4, 3, 1, 11),
(277, '2025-08-09 07:25:16.853237', 36.2, 1, 1, 1),
(278, '2025-08-09 08:12:51.853237', 37.1, 1, 1, 3),
(279, '2025-08-09 07:15:01.853237', 36.7, 3, 1, 30),
(280, '2025-08-09 07:12:17.853237', 37.3, 3, 1, 20),
(281, '2025-08-09 07:55:27.853237', 36, 3, 2, 50),
(282, '2025-08-09 07:56:06.853237', 36.2, 3, 1, 4),
(283, '2025-08-09 08:03:35.853237', 36.1, 1, 1, 2),
(284, '2025-08-09 07:03:05.853237', 37.4, 3, 2, 51),
(285, '2025-08-09 08:29:45.853237', 37.3, 1, 2, 47),
(286, '2025-08-09 08:14:41.853237', 36.6, 3, 2, 41),
(287, '2025-08-08 07:37:49.004656', 37, 3, 1, 30),
(288, '2025-08-08 07:12:59.004656', 36.9, 3, 2, 51),
(289, '2025-08-08 08:06:59.004656', 37.3, 3, 2, 41),
(290, '2025-08-08 07:55:53.004656', 36.2, 1, 1, 1),
(291, '2025-08-08 07:54:43.004656', 36.4, 3, 1, 11),
(292, '2025-08-08 08:22:20.004656', 36.4, 3, 1, 2),
(293, '2025-08-08 07:21:52.004656', 36.6, 3, 1, 20),
(294, '2025-08-08 07:36:53.004656', 36.5, 1, 2, 40),
(295, '2025-08-08 08:23:16.004656', 37.4, 1, 2, 47),
(296, '2025-08-08 07:34:02.004656', 36.2, 1, 1, 4),
(297, '2025-08-08 07:18:41.004656', 36.3, 1, 1, 10),
(298, '2025-08-07 07:10:52.171371', 37.2, 3, 1, 2),
(299, '2025-08-07 08:07:03.171371', 36.4, 3, 2, 40),
(300, '2025-08-07 07:14:21.171371', 37.3, 1, 1, 11),
(301, '2025-08-07 08:19:59.171371', 36.4, 3, 1, 30),
(302, '2025-08-07 07:26:28.171371', 36.2, 1, 1, 1),
(303, '2025-08-07 07:43:32.171371', 37.3, 1, 1, 4),
(304, '2025-08-07 08:28:45.171371', 36.4, 1, 1, 3),
(305, '2025-08-07 08:09:15.171371', 36.3, 3, 1, 5),
(306, '2025-08-07 07:04:01.171371', 37.4, 3, 2, 41),
(307, '2025-08-07 07:46:54.171371', 36.3, 1, 2, 47),
(308, '2025-08-07 07:53:08.171371', 37.1, 3, 1, 20),
(309, '2025-08-06 07:01:41.328197', 36.4, 1, 1, 10),
(310, '2025-08-06 07:52:26.328197', 36.9, 3, 2, 51),
(311, '2025-08-06 07:19:28.328197', 36.6, 3, 2, 47),
(312, '2025-08-06 07:44:20.328197', 37.2, 1, 1, 20),
(313, '2025-08-06 07:03:12.328197', 37.5, 3, 2, 41),
(314, '2025-08-06 07:08:42.328197', 37, 1, 1, 30),
(315, '2025-08-06 07:08:17.328197', 36.7, 1, 1, 11),
(316, '2025-08-06 07:57:21.328197', 36.2, 3, 1, 1),
(317, '2025-08-06 07:00:28.328197', 37.1, 1, 2, 40),
(318, '2025-08-06 08:21:58.328197', 36.4, 1, 1, 2),
(319, '2025-08-06 08:27:25.328197', 36.5, 3, 2, 50),
(320, '2025-08-05 08:16:03.480560', 36.5, 1, 1, 3),
(321, '2025-08-05 08:25:48.480560', 36.7, 1, 1, 30),
(322, '2025-08-05 07:54:03.480560', 37.1, 3, 2, 51),
(323, '2025-08-05 07:22:03.480560', 36.2, 1, 1, 20),
(324, '2025-08-05 07:52:42.480560', 36.2, 3, 1, 11),
(325, '2025-08-05 07:05:24.480560', 36.2, 1, 2, 50),
(326, '2025-08-05 07:20:47.480560', 36.8, 3, 1, 4),
(327, '2025-08-05 08:04:48.480560', 36.8, 1, 1, 10),
(328, '2025-08-05 07:20:11.480560', 36.9, 1, 1, 1),
(329, '2025-08-05 07:43:28.480560', 36, 1, 2, 40),
(330, '2025-08-05 08:02:56.480560', 37.4, 3, 2, 47),
(331, '2025-09-03 20:05:50.000000', 36, 1, 1, 47),
(332, '2025-09-03 20:20:26.000000', 36.1, 1, NULL, 59);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias_curso`
--

CREATE TABLE `asistencias_curso` (
  `idCurso` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL,
  `institucion_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `asistencias_curso`
--

INSERT INTO `asistencias_curso` (`idCurso`, `nombre`, `activo`, `institucion_id`) VALUES
(1, '1er Año', 1, 1),
(2, '2do Año', 1, 1),
(3, '3er Año', 1, 1),
(4, '4to Año', 1, 1),
(5, '5to Año', 1, 1),
(6, '6to Año', 1, 1),
(7, 'Programación Python', 1, 2),
(8, 'Desarrollo Web', 1, 2),
(9, 'Diseño Gráfico', 1, 2),
(10, 'Robótica', 1, 2),
(11, 'Marketing Digital', 1, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias_estadoasistencia`
--

CREATE TABLE `asistencias_estadoasistencia` (
  `idEstadoAsistencia` int NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` longtext
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `asistencias_estadoasistencia`
--

INSERT INTO `asistencias_estadoasistencia` (`idEstadoAsistencia`, `nombre`, `descripcion`) VALUES
(1, 'Presente', 'Asistencia registrada correctamente'),
(2, 'Ausente', 'No se registró asistencia'),
(3, 'Tarde', 'Llegada tardía');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias_institucion`
--

CREATE TABLE `asistencias_institucion` (
  `idInstitucion` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` longtext,
  `activa` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `asistencias_institucion`
--

INSERT INTO `asistencias_institucion` (`idInstitucion`, `nombre`, `descripcion`, `activa`) VALUES
(1, 'ISAE', 'Instituto Superior de Enseñanza', 1),
(2, 'TecnoAliados', 'Cursos Extraprogramáticos de Tecnología', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias_persona`
--

CREATE TABLE `asistencias_persona` (
  `idPersona` int NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `activo` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `asistencias_persona`
--

INSERT INTO `asistencias_persona` (`idPersona`, `nombre`, `activo`) VALUES
(1, 'Juan Pérez', 1),
(2, 'María García', 1),
(3, 'Carlos López', 1),
(4, 'Ana Martínez', 1),
(5, 'Luis Rodríguez', 1),
(10, 'Prof. Roberto Silva', 1),
(11, 'Prof. Carmen Vega', 1),
(20, 'Admin. Patricia Ruiz', 1),
(30, 'Dir. Miguel Torres', 1),
(40, 'Instructor Python', 1),
(41, 'Instructor Web', 1),
(47, 'Javier Nieto', 1),
(50, 'Tech Student 1', 1),
(51, 'Tech Student 2', 1),
(59, 'Agus el capo', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias_personainstitucion`
--

CREATE TABLE `asistencias_personainstitucion` (
  `idPersonaInstitucion` int NOT NULL,
  `activo` tinyint(1) NOT NULL,
  `fecha_ingreso` date NOT NULL,
  `curso_id` int DEFAULT NULL,
  `institucion_id` int NOT NULL,
  `persona_id` int NOT NULL,
  `tipo_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `asistencias_personainstitucion`
--

INSERT INTO `asistencias_personainstitucion` (`idPersonaInstitucion`, `activo`, `fecha_ingreso`, `curso_id`, `institucion_id`, `persona_id`, `tipo_id`) VALUES
(1, 1, '2025-09-03', 5, 1, 47, 1),
(2, 1, '2025-09-03', 7, 2, 47, 6),
(3, 1, '2025-09-03', 2, 1, 1, 1),
(4, 1, '2025-09-03', 4, 1, 2, 1),
(5, 1, '2025-09-03', 2, 1, 3, 1),
(6, 1, '2025-09-03', 4, 1, 4, 1),
(7, 1, '2025-09-03', 4, 1, 5, 1),
(8, 1, '2025-09-03', NULL, 1, 10, 2),
(9, 1, '2025-09-03', NULL, 1, 11, 2),
(10, 1, '2025-09-03', NULL, 1, 20, 3),
(11, 1, '2025-09-03', NULL, 1, 30, 4),
(12, 1, '2025-09-03', 7, 2, 40, 6),
(13, 1, '2025-09-03', 8, 2, 41, 6),
(14, 1, '2025-09-03', 11, 2, 50, 5),
(15, 1, '2025-09-03', 7, 2, 51, 5);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias_tipopersona`
--

CREATE TABLE `asistencias_tipopersona` (
  `idTipoPersona` int NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `activo` tinyint(1) NOT NULL,
  `institucion_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `asistencias_tipopersona`
--

INSERT INTO `asistencias_tipopersona` (`idTipoPersona`, `nombre`, `activo`, `institucion_id`) VALUES
(1, 'Estudiante', 1, 1),
(2, 'Profesor', 1, 1),
(3, 'Administrativo', 1, 1),
(4, 'Director', 1, 1),
(5, 'Estudiante', 1, 2),
(6, 'Instructor', 1, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auth_group`
--

CREATE TABLE `auth_group` (
  `id` int NOT NULL,
  `name` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auth_group_permissions`
--

CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auth_permission`
--

CREATE TABLE `auth_permission` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `auth_permission`
--

INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES
(1, 'Can add log entry', 1, 'add_logentry'),
(2, 'Can change log entry', 1, 'change_logentry'),
(3, 'Can delete log entry', 1, 'delete_logentry'),
(4, 'Can view log entry', 1, 'view_logentry'),
(5, 'Can add permission', 2, 'add_permission'),
(6, 'Can change permission', 2, 'change_permission'),
(7, 'Can delete permission', 2, 'delete_permission'),
(8, 'Can view permission', 2, 'view_permission'),
(9, 'Can add group', 3, 'add_group'),
(10, 'Can change group', 3, 'change_group'),
(11, 'Can delete group', 3, 'delete_group'),
(12, 'Can view group', 3, 'view_group'),
(13, 'Can add user', 4, 'add_user'),
(14, 'Can change user', 4, 'change_user'),
(15, 'Can delete user', 4, 'delete_user'),
(16, 'Can view user', 4, 'view_user'),
(17, 'Can add content type', 5, 'add_contenttype'),
(18, 'Can change content type', 5, 'change_contenttype'),
(19, 'Can delete content type', 5, 'delete_contenttype'),
(20, 'Can view content type', 5, 'view_contenttype'),
(21, 'Can add session', 6, 'add_session'),
(22, 'Can change session', 6, 'change_session'),
(23, 'Can delete session', 6, 'delete_session'),
(24, 'Can view session', 6, 'view_session'),
(25, 'Can add institucion', 7, 'add_institucion'),
(26, 'Can change institucion', 7, 'change_institucion'),
(27, 'Can delete institucion', 7, 'delete_institucion'),
(28, 'Can view institucion', 7, 'view_institucion'),
(29, 'Can add persona', 8, 'add_persona'),
(30, 'Can change persona', 8, 'change_persona'),
(31, 'Can delete persona', 8, 'delete_persona'),
(32, 'Can view persona', 8, 'view_persona'),
(33, 'Can add persona institucion', 9, 'add_personainstitucion'),
(34, 'Can change persona institucion', 9, 'change_personainstitucion'),
(35, 'Can delete persona institucion', 9, 'delete_personainstitucion'),
(36, 'Can view persona institucion', 9, 'view_personainstitucion'),
(37, 'Can add curso', 10, 'add_curso'),
(38, 'Can change curso', 10, 'change_curso'),
(39, 'Can delete curso', 10, 'delete_curso'),
(40, 'Can view curso', 10, 'view_curso'),
(41, 'Can add estado asistencia', 11, 'add_estadoasistencia'),
(42, 'Can change estado asistencia', 11, 'change_estadoasistencia'),
(43, 'Can delete estado asistencia', 11, 'delete_estadoasistencia'),
(44, 'Can view estado asistencia', 11, 'view_estadoasistencia'),
(45, 'Can add asistencia', 12, 'add_asistencia'),
(46, 'Can change asistencia', 12, 'change_asistencia'),
(47, 'Can delete asistencia', 12, 'delete_asistencia'),
(48, 'Can view asistencia', 12, 'view_asistencia'),
(49, 'Can add tipo persona', 13, 'add_tipopersona'),
(50, 'Can change tipo persona', 13, 'change_tipopersona'),
(51, 'Can delete tipo persona', 13, 'delete_tipopersona'),
(52, 'Can view tipo persona', 13, 'view_tipopersona');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auth_user`
--

CREATE TABLE `auth_user` (
  `id` int NOT NULL,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `auth_user`
--

INSERT INTO `auth_user` (`id`, `password`, `last_login`, `is_superuser`, `username`, `first_name`, `last_name`, `email`, `is_staff`, `is_active`, `date_joined`) VALUES
(1, 'pbkdf2_sha256$1000000$uAUTECrsivWQt1OBfiVo99$18cfsWm25ypKXHFsowUh75fdewT1wbtSx0U904STXpI=', '2025-09-03 23:12:21.194052', 1, 'javinnieto', '', '', 'javier@admin.com', 1, 1, '2025-09-03 18:51:50.492264');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auth_user_groups`
--

CREATE TABLE `auth_user_groups` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `group_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auth_user_user_permissions`
--

CREATE TABLE `auth_user_user_permissions` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `django_admin_log`
--

CREATE TABLE `django_admin_log` (
  `id` int NOT NULL,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint UNSIGNED NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` int NOT NULL
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `django_content_type`
--

CREATE TABLE `django_content_type` (
  `id` int NOT NULL,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `django_content_type`
--

INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES
(1, 'admin', 'logentry'),
(12, 'asistencias', 'asistencia'),
(10, 'asistencias', 'curso'),
(11, 'asistencias', 'estadoasistencia'),
(7, 'asistencias', 'institucion'),
(8, 'asistencias', 'persona'),
(9, 'asistencias', 'personainstitucion'),
(13, 'asistencias', 'tipopersona'),
(3, 'auth', 'group'),
(2, 'auth', 'permission'),
(4, 'auth', 'user'),
(5, 'contenttypes', 'contenttype'),
(6, 'sessions', 'session');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `django_migrations`
--

CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `django_migrations`
--

INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES
(1, 'contenttypes', '0001_initial', '2025-09-03 18:48:01.330087'),
(2, 'auth', '0001_initial', '2025-09-03 18:48:03.425417'),
(3, 'admin', '0001_initial', '2025-09-03 18:48:03.865559'),
(4, 'admin', '0002_logentry_remove_auto_add', '2025-09-03 18:48:03.881487'),
(5, 'admin', '0003_logentry_add_action_flag_choices', '2025-09-03 18:48:03.897999'),
(6, 'contenttypes', '0002_remove_content_type_name', '2025-09-03 18:48:04.152499'),
(7, 'auth', '0002_alter_permission_name_max_length', '2025-09-03 18:48:04.346937'),
(8, 'auth', '0003_alter_user_email_max_length', '2025-09-03 18:48:04.410292'),
(9, 'auth', '0004_alter_user_username_opts', '2025-09-03 18:48:04.435626'),
(10, 'auth', '0005_alter_user_last_login_null', '2025-09-03 18:48:04.589938'),
(11, 'auth', '0006_require_contenttypes_0002', '2025-09-03 18:48:04.597996'),
(12, 'auth', '0007_alter_validators_add_error_messages', '2025-09-03 18:48:04.624298'),
(13, 'auth', '0008_alter_user_username_max_length', '2025-09-03 18:48:04.801115'),
(14, 'auth', '0009_alter_user_last_name_max_length', '2025-09-03 18:48:04.997887'),
(15, 'auth', '0010_alter_group_name_max_length', '2025-09-03 18:48:05.045662'),
(16, 'auth', '0011_update_proxy_permissions', '2025-09-03 18:48:05.065452'),
(17, 'auth', '0012_alter_user_first_name_max_length', '2025-09-03 18:48:05.221722'),
(18, 'sessions', '0001_initial', '2025-09-03 18:48:05.314756'),
(19, 'asistencias', '0001_initial', '2025-09-03 18:51:18.354163'),
(20, 'asistencias', '0002_curso_nivel_alter_persona_nombre', '2025-09-03 19:15:17.902656'),
(21, 'asistencias', '0003_remove_curso_nivel_alter_persona_nombre', '2025-09-03 19:15:41.754443');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `django_session`
--

CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `django_session`
--

INSERT INTO `django_session` (`session_key`, `session_data`, `expire_date`) VALUES
('qdepbhudh1eqlif0vdctrcagbhpvl7g3', '.eJxVjEEOwiAQRe_C2pAODFBcuvcMZBhAqoYmpV0Z765NutDtf-_9lwi0rTVsPS9hSuIsQJx-t0j8yG0H6U7tNkue27pMUe6KPGiX1znl5-Vw_w4q9fqts05o0fKIwIDKKV-AdYTELrLOGnXxNHqwWICs9orMgNYwGxhYuSjeH87ZNzU:1utufm:Ed_ZyLm1stnBk8WIQxas6sqe1hD3E3LrQaR9Y5TggwM', '2025-09-17 21:05:42.177929');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `asistencias_asistencia`
--
ALTER TABLE `asistencias_asistencia`
  ADD PRIMARY KEY (`idAsistencia`),
  ADD KEY `asistencias_asistenc_estado_id_bf1e5968_fk_asistenci` (`estado_id`),
  ADD KEY `asistencias_asistenc_institucion_id_93027715_fk_asistenci` (`institucion_id`),
  ADD KEY `asistencias_asistenc_persona_id_ef4f68f8_fk_asistenci` (`persona_id`);

--
-- Indices de la tabla `asistencias_curso`
--
ALTER TABLE `asistencias_curso`
  ADD PRIMARY KEY (`idCurso`),
  ADD UNIQUE KEY `asistencias_curso_nombre_institucion_id_57a7b747_uniq` (`nombre`,`institucion_id`),
  ADD KEY `asistencias_curso_institucion_id_8013a31c_fk_asistenci` (`institucion_id`);

--
-- Indices de la tabla `asistencias_estadoasistencia`
--
ALTER TABLE `asistencias_estadoasistencia`
  ADD PRIMARY KEY (`idEstadoAsistencia`);

--
-- Indices de la tabla `asistencias_institucion`
--
ALTER TABLE `asistencias_institucion`
  ADD PRIMARY KEY (`idInstitucion`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `asistencias_persona`
--
ALTER TABLE `asistencias_persona`
  ADD PRIMARY KEY (`idPersona`);

--
-- Indices de la tabla `asistencias_personainstitucion`
--
ALTER TABLE `asistencias_personainstitucion`
  ADD PRIMARY KEY (`idPersonaInstitucion`),
  ADD UNIQUE KEY `asistencias_personainsti_persona_id_institucion_i_da2df673_uniq` (`persona_id`,`institucion_id`,`tipo_id`,`curso_id`),
  ADD KEY `asistencias_personai_curso_id_00ffc721_fk_asistenci` (`curso_id`),
  ADD KEY `asistencias_personai_institucion_id_9804e7bf_fk_asistenci` (`institucion_id`),
  ADD KEY `asistencias_personai_tipo_id_de315754_fk_asistenci` (`tipo_id`);

--
-- Indices de la tabla `asistencias_tipopersona`
--
ALTER TABLE `asistencias_tipopersona`
  ADD PRIMARY KEY (`idTipoPersona`),
  ADD UNIQUE KEY `asistencias_tipopersona_nombre_institucion_id_9eb7bcec_uniq` (`nombre`,`institucion_id`),
  ADD KEY `asistencias_tipopers_institucion_id_505b2cc3_fk_asistenci` (`institucion_id`);

--
-- Indices de la tabla `auth_group`
--
ALTER TABLE `auth_group`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indices de la tabla `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  ADD KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`);

--
-- Indices de la tabla `auth_permission`
--
ALTER TABLE `auth_permission`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`);

--
-- Indices de la tabla `auth_user`
--
ALTER TABLE `auth_user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indices de la tabla `auth_user_groups`
--
ALTER TABLE `auth_user_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_user_groups_user_id_group_id_94350c0c_uniq` (`user_id`,`group_id`),
  ADD KEY `auth_user_groups_group_id_97559544_fk_auth_group_id` (`group_id`);

--
-- Indices de la tabla `auth_user_user_permissions`
--
ALTER TABLE `auth_user_user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` (`user_id`,`permission_id`),
  ADD KEY `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` (`permission_id`);

--
-- Indices de la tabla `django_admin_log`
--
ALTER TABLE `django_admin_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  ADD KEY `django_admin_log_user_id_c564eba6_fk_auth_user_id` (`user_id`);

--
-- Indices de la tabla `django_content_type`
--
ALTER TABLE `django_content_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`);

--
-- Indices de la tabla `django_migrations`
--
ALTER TABLE `django_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `django_session`
--
ALTER TABLE `django_session`
  ADD PRIMARY KEY (`session_key`),
  ADD KEY `django_session_expire_date_a5c62663` (`expire_date`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `asistencias_asistencia`
--
ALTER TABLE `asistencias_asistencia`
  MODIFY `idAsistencia` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=333;

--
-- AUTO_INCREMENT de la tabla `asistencias_curso`
--
ALTER TABLE `asistencias_curso`
  MODIFY `idCurso` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `asistencias_estadoasistencia`
--
ALTER TABLE `asistencias_estadoasistencia`
  MODIFY `idEstadoAsistencia` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `asistencias_institucion`
--
ALTER TABLE `asistencias_institucion`
  MODIFY `idInstitucion` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `asistencias_personainstitucion`
--
ALTER TABLE `asistencias_personainstitucion`
  MODIFY `idPersonaInstitucion` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `asistencias_tipopersona`
--
ALTER TABLE `asistencias_tipopersona`
  MODIFY `idTipoPersona` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `auth_group`
--
ALTER TABLE `auth_group`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `auth_permission`
--
ALTER TABLE `auth_permission`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT de la tabla `auth_user`
--
ALTER TABLE `auth_user`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `auth_user_groups`
--
ALTER TABLE `auth_user_groups`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `auth_user_user_permissions`
--
ALTER TABLE `auth_user_user_permissions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `django_admin_log`
--
ALTER TABLE `django_admin_log`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `django_content_type`
--
ALTER TABLE `django_content_type`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `django_migrations`
--
ALTER TABLE `django_migrations`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `asistencias_asistencia`
--
ALTER TABLE `asistencias_asistencia`
  ADD CONSTRAINT `asistencias_asistenc_estado_id_bf1e5968_fk_asistenci` FOREIGN KEY (`estado_id`) REFERENCES `asistencias_estadoasistencia` (`idEstadoAsistencia`),
  ADD CONSTRAINT `asistencias_asistenc_institucion_id_93027715_fk_asistenci` FOREIGN KEY (`institucion_id`) REFERENCES `asistencias_institucion` (`idInstitucion`),
  ADD CONSTRAINT `asistencias_asistenc_persona_id_ef4f68f8_fk_asistenci` FOREIGN KEY (`persona_id`) REFERENCES `asistencias_persona` (`idPersona`);

--
-- Filtros para la tabla `asistencias_curso`
--
ALTER TABLE `asistencias_curso`
  ADD CONSTRAINT `asistencias_curso_institucion_id_8013a31c_fk_asistenci` FOREIGN KEY (`institucion_id`) REFERENCES `asistencias_institucion` (`idInstitucion`);

--
-- Filtros para la tabla `asistencias_personainstitucion`
--
ALTER TABLE `asistencias_personainstitucion`
  ADD CONSTRAINT `asistencias_personai_curso_id_00ffc721_fk_asistenci` FOREIGN KEY (`curso_id`) REFERENCES `asistencias_curso` (`idCurso`),
  ADD CONSTRAINT `asistencias_personai_institucion_id_9804e7bf_fk_asistenci` FOREIGN KEY (`institucion_id`) REFERENCES `asistencias_institucion` (`idInstitucion`),
  ADD CONSTRAINT `asistencias_personai_persona_id_73ceefa8_fk_asistenci` FOREIGN KEY (`persona_id`) REFERENCES `asistencias_persona` (`idPersona`),
  ADD CONSTRAINT `asistencias_personai_tipo_id_de315754_fk_asistenci` FOREIGN KEY (`tipo_id`) REFERENCES `asistencias_tipopersona` (`idTipoPersona`);

--
-- Filtros para la tabla `asistencias_tipopersona`
--
ALTER TABLE `asistencias_tipopersona`
  ADD CONSTRAINT `asistencias_tipopers_institucion_id_505b2cc3_fk_asistenci` FOREIGN KEY (`institucion_id`) REFERENCES `asistencias_institucion` (`idInstitucion`);

--
-- Filtros para la tabla `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  ADD CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  ADD CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`);

--
-- Filtros para la tabla `auth_permission`
--
ALTER TABLE `auth_permission`
  ADD CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`);

--
-- Filtros para la tabla `auth_user_groups`
--
ALTER TABLE `auth_user_groups`
  ADD CONSTRAINT `auth_user_groups_group_id_97559544_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  ADD CONSTRAINT `auth_user_groups_user_id_6a12ed8b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Filtros para la tabla `auth_user_user_permissions`
--
ALTER TABLE `auth_user_user_permissions`
  ADD CONSTRAINT `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  ADD CONSTRAINT `auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Filtros para la tabla `django_admin_log`
--
ALTER TABLE `django_admin_log`
  ADD CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  ADD CONSTRAINT `django_admin_log_user_id_c564eba6_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);
SET FOREIGN_KEY_CHECKS=1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
